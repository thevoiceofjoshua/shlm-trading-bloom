import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bibleMessageInput, teachingInput, FREE_VIDEO_LIMIT } from "@/lib/bible-rules";

type Context = { userId: string; supabase: any; claims: Record<string,unknown> };
async function admin(context: Context) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Administrator access required.");
}
async function joined(context: Context) {
  const { data, error } = await context.supabase.from("bible_memberships").select("*").eq("user_id", context.userId).maybeSingle();
  if (error || !data?.active || data.blocked) throw new Error("Join Bible Study to continue.");
  return data;
}
export const getBibleWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [{ data: member, error }, role] = await Promise.all([context.supabase.from("bible_memberships").select("*").eq("user_id",context.userId).maybeSingle(),context.supabase.rpc("has_role",{ _user_id:context.userId,_role:"admin" })]);
  if (error || role.error) throw new Error("Bible Study could not be loaded.");
  const isAdmin = role.data === true;
  if ((!member?.active || member.blocked) && !isAdmin) return { member, isAdmin, teachings: [], notifications: [] };
  const [teachings, notifications] = await Promise.all([context.supabase.from("bible_teachings").select("*").order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(100),context.supabase.from("bible_notifications").select("*").is("read_at",null).order("created_at",{ascending:false}).limit(50)]);
  if (teachings.error || notifications.error) throw new Error("Bible Study could not be loaded.");
  return { member, isAdmin, teachings: teachings.data ?? [], notifications: notifications.data ?? [] };
});
export const setBibleMembership = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({ active:z.boolean(),notifications:z.boolean().optional() }).parse(input)).handler(async({context,data})=>{
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:existing,error:readError}=await context.supabase.from("bible_memberships").select("*").eq("user_id",context.userId).maybeSingle();
  if(readError||existing?.blocked&&data.active) throw new Error("Membership is restricted. Contact the administrator.");
  const {error}=await supabaseAdmin.from("bible_memberships").upsert({user_id:context.userId,active:data.active,...(data.notifications===undefined?{}:{notifications:data.notifications})},{onConflict:"user_id"});
  if(error)throw new Error("Membership not saved. Try again."); return {saved:true};
});
export const getBibleChat = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({before:z.string().datetime().optional()}).parse(input??{})).handler(async({context,data})=>{
  await joined(context);
  let query=context.supabase.from("bible_messages").select("*").eq("removed",false).order("created_at",{ascending:false}).limit(50);
  if(data.before)query=query.lt("created_at",data.before);
  const [messages,pins]=await Promise.all([query,context.supabase.from("bible_messages").select("*").eq("pinned",true).eq("removed",false).order("created_at",{ascending:false}).limit(20)]);
  if(messages.error||pins.error)throw new Error("Messages could not be loaded.");
  const ids=(messages.data??[]).map(m=>m.id);
  const reactions=ids.length?await context.supabase.from("bible_reactions").select("*").in("message_id",ids):{data:[],error:null};
  if(reactions.error)throw new Error("Reactions could not be loaded.");
  return {messages:(messages.data??[]).reverse(),pins:pins.data??[],reactions:reactions.data??[],hasMore:(messages.data?.length??0)===50};
});
export const postBibleMessage=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>bibleMessageInput.parse(input)).handler(async({context,data})=>{
  await joined(context);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:user,error:userError}=await supabaseAdmin.auth.admin.getUserById(context.userId);
  if(userError||!user.user||user.user.banned_until&&Date.parse(user.user.banned_until)>Date.now())throw new Error("Posting is restricted.");
  const name=user.user.user_metadata?.full_name??user.user.user_metadata?.name??"Member";
  const {data:message,error}=await supabaseAdmin.rpc("send_bible_message",{p_user:context.userId,p_name:String(name),p_body:data.body,p_reply:data.replyTo,p_submission:data.submissionId} as any);
  if(error)throw new Error(error.message.includes("wait")?"Please wait before sending another message.":"Message not confirmed. Retry the same message.");
  return {saved:true,message};
});
export const reactBibleMessage=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid(),reaction:z.enum(["heart","amen","pray"]),active:z.boolean()}).parse(input)).handler(async({context,data})=>{
  const member=await joined(context); if(member.muted_until&&Date.parse(member.muted_until)>Date.now())throw new Error("Posting is temporarily restricted.");
  const {data:message,error:readError}=await context.supabase.from("bible_messages").select("id").eq("id",data.id).eq("removed",false).maybeSingle(); if(readError||!message)throw new Error("Message unavailable.");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const response=data.active?await supabaseAdmin.from("bible_reactions").upsert({message_id:data.id,user_id:context.userId,reaction:data.reaction}):await supabaseAdmin.from("bible_reactions").delete().eq("message_id",data.id).eq("user_id",context.userId).eq("reaction",data.reaction);
  if(response.error)throw new Error("Reaction not saved."); return {saved:true};
});
export const moderateBible=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.discriminatedUnion("action",[
  z.object({action:z.literal("pin"),id:z.string().uuid(),value:z.boolean()}),z.object({action:z.literal("remove"),id:z.string().uuid(),value:z.boolean()}),
  z.object({action:z.literal("member"),id:z.string().uuid(),blocked:z.boolean(),muteHours:z.number().int().min(0).max(720)})
]).parse(input)).handler(async({context,data})=>{
  await admin(context);const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");
  const response=data.action==="member"?await supabaseAdmin.from("bible_memberships").update({blocked:data.blocked,muted_until:data.muteHours?new Date(Date.now()+data.muteHours*3600000).toISOString():null}).eq("user_id",data.id):await supabaseAdmin.from("bible_messages").update(data.action==="pin"?{pinned:data.value}:{removed:data.value}).eq("id",data.id);
  if(response.error)throw new Error("Moderation not saved.");return{saved:true};
});
export const listBibleMembers=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  await admin(context); const{data,error}=await context.supabase.from("bible_memberships").select("*").order("joined_at",{ascending:false}).limit(200);if(error)throw new Error("Members could not be loaded.");return data??[];
});
export const saveTeaching=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>teachingInput.parse(input)).handler(async({context,data})=>{
  await admin(context);const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");
  if(data.published){const{data:row,error}=await context.supabase.from("bible_teachings").select("state,playback_id").eq("id",data.id??"").maybeSingle();if(error||row?.state!=="ready"||!row.playback_id)throw new Error("Video must finish processing before publication.");}
  const response=data.id?await supabaseAdmin.from("bible_teachings").update(data).eq("id",data.id).select("*").single():await supabaseAdmin.from("bible_teachings").insert({...data,created_by:context.userId}).select("*").single();
  if(response.error)throw new Error("Teaching not saved.");return{saved:true,teaching:response.data};
});
export const beginTeachingUpload=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid(),name:z.string().max(255),size:z.number().positive().max(20000000000)}).parse(input)).handler(async({context,data})=>{
  await admin(context);
  const tokenId=process.env["MUX_TOKEN_ID"],secret=process.env["MUX_TOKEN_SECRET"];
  if(!tokenId||!secret)throw new Error("Mux is not connected.");
  if(!/\.(mp4|mov)$/i.test(data.name))throw new Error("Choose an MP4 or MOV video.");
  const{data:teaching,error}=await context.supabase.from("bible_teachings").select("*").eq("id",data.id).single();if(error||!teaching||teaching.mux_asset_id)throw new Error("Create a new teaching before uploading a video.");
  const auth="Basic "+btoa(tokenId+":"+secret);
  if(teaching.mux_upload_id){const r=await fetch(`https://api.mux.com/video/v1/uploads/${encodeURIComponent(teaching.mux_upload_id)}`,{headers:{Authorization:auth}}); if(r.ok){const previous=(await r.json()).data;if(previous.status==="waiting")return{uploadId:previous.id,url:previous.url};} throw new Error("Existing upload is processing or expired. Refresh its status before retrying.");}
  const inventory=await fetch("https://api.mux.com/video/v1/assets?limit=10",{headers:{Authorization:auth}});if(!inventory.ok)throw new Error("Mux connection could not be verified.");const assets=await inventory.json();if(assets.data?.length>=FREE_VIDEO_LIMIT)throw new Error("Free video library is full (10 assets). Delete an old video in Mux before uploading.");
  const origin=new URL(getRequest().url).origin;
  const r=await fetch("https://api.mux.com/video/v1/uploads",{method:"POST",headers:{Authorization:auth,"Content-Type":"application/json"},body:JSON.stringify({cors_origin:origin,new_asset_settings:{playback_policies:["signed"],video_quality:"basic",passthrough:data.id}})});
  if(!r.ok){console.error("Mux upload request failed",r.status);throw new Error("Upload could not be started. Check Mux account access.");}
  const upload=(await r.json()).data;
  const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");const{error:saveError}=await supabaseAdmin.from("bible_teachings").update({mux_upload_id:upload.id,state:"uploading",file_size:data.size,media_type:data.name.toLowerCase().endsWith(".mov")?"video/quicktime":"video/mp4"}).eq("id",data.id);
  if(saveError)throw new Error("Upload record not confirmed. No file sent.");return{uploadId:upload.id,url:upload.url};
});
export const refreshTeachingVideo=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid()}).parse(input)).handler(async({context,data})=>{
  await admin(context);const{data:row,error}=await context.supabase.from("bible_teachings").select("*").eq("id",data.id).single();if(error||!row?.mux_upload_id)throw new Error("No upload to refresh.");
  const tokenId=process.env["MUX_TOKEN_ID"],secret=process.env["MUX_TOKEN_SECRET"];if(!tokenId||!secret)throw new Error("Mux not connected.");
  const headers={Authorization:"Basic "+btoa(tokenId+":"+secret)};
  const response=await fetch(`https://api.mux.com/video/v1/uploads/${encodeURIComponent(row.mux_upload_id)}`,{headers});if(!response.ok)throw new Error("Upload status could not be checked.");const upload=(await response.json()).data;
  let patch:Record<string,unknown>={state:["errored","cancelled","timed_out"].includes(upload.status)?"failed":"processing"};
  if(upload.asset_id){const r=await fetch(`https://api.mux.com/video/v1/assets/${encodeURIComponent(upload.asset_id)}`,{headers});if(!r.ok)throw new Error("Processing status could not be checked.");const asset=(await r.json()).data;patch={mux_asset_id:asset.id,state:asset.status==="ready"?"ready":asset.status==="errored"?"failed":"processing",playback_id:asset.playback_ids?.find((p:{policy:string})=>p.policy==="signed")?.id??null,duration_seconds:asset.duration??null};}
  const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");const{error:saveError}=await supabaseAdmin.from("bible_teachings").update(patch).eq("id",row.id);if(saveError)throw new Error("Processing status not saved.");return{saved:true,state:patch.state};
});
export const getTeachingPlayback=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid()}).parse(input)).handler(async({context,data})=>{
  await joined(context);const{data:row,error}=await context.supabase.from("bible_teachings").select("*").eq("id",data.id).single();if(error||!row?.playback_id||row.state!=="ready")throw new Error("Teaching not available.");
  const kid=process.env["MUX_SIGNING_KEY_ID"],raw=process.env["MUX_SIGNING_PRIVATE_KEY"];if(!kid||!raw)throw new Error("Private video playback is not connected.");
  const{importPKCS8,SignJWT}=await import("jose");const pem=raw.includes("BEGIN")?raw:atob(raw);const key=await importPKCS8(pem,"RS256");
  const token=await new SignJWT({}).setProtectedHeader({alg:"RS256",kid}).setSubject(row.playback_id).setAudience("v").setExpirationTime("2h").sign(key);
  const thumbnailToken=await new SignJWT({}).setProtectedHeader({alg:"RS256",kid}).setSubject(row.playback_id).setAudience("t").setExpirationTime("2h").sign(key);
  return {url:`https://player.mux.com/${row.playback_id}?token=${token}`,thumbnail:`https://image.mux.com/${row.playback_id}/thumbnail.jpg?token=${thumbnailToken}`};
});
export const deleteTeaching=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid()}).parse(input)).handler(async({context,data})=>{
  await admin(context);const{data:row,error}=await context.supabase.from("bible_teachings").select("*").eq("id",data.id).single();if(error||!row)throw new Error("Teaching not found.");
  if(row.mux_asset_id){const tokenId=process.env["MUX_TOKEN_ID"],secret=process.env["MUX_TOKEN_SECRET"];if(!tokenId||!secret)throw new Error("Mux not connected.");const r=await fetch(`https://api.mux.com/video/v1/assets/${encodeURIComponent(row.mux_asset_id)}`,{method:"DELETE",headers:{Authorization:"Basic "+btoa(tokenId+":"+secret)}});if(!r.ok&&r.status!==404)throw new Error("Video deletion not confirmed.");}
  const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");const{error:delError}=await supabaseAdmin.from("bible_teachings").delete().eq("id",data.id);if(delError)throw new Error("Teaching deletion not confirmed.");return{saved:true};
});
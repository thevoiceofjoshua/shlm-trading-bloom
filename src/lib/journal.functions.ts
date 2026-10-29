import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const saveJournalEntry=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),oldKey:z.string().max(120),newKey:z.string().min(1).max(120),body:z.string().max(1000000),expectedUpdatedAt:z.string().nullable()}).parse(input)).handler(async({context,data})=>{
 const{data:saved,error}=await context.supabase.rpc("save_journal_entry_confirmed",{p_date:data.date,p_old_key:data.oldKey,p_new_key:data.newKey,p_body:data.body,p_expected:data.expectedUpdatedAt} as any);
 if(error)throw new Error(error.message.includes("changed")?"Entry changed elsewhere. Reload before saving.":error.message.includes("Guard")?"Guard trades cannot be edited or deleted through Journal.":"Entry not saved. Retry or reload.");
 const result=saved as {key?:string;updatedAt?:string}|null;
 if(!result?.key||!result.updatedAt)throw new Error("Save confirmation was not returned. Reload to check the entry.");
 return {saved:true,key:result.key,updatedAt:result.updatedAt};
});
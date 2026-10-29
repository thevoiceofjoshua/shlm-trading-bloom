import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FORECAST_VERSION,snapshotSlot } from "@/lib/forecast-rules";
import { fetchForecastContext,sourceBars } from "@/lib/forecast-data.server";
export async function recordForecastTick(now=new Date()){
 const slot=snapshotSlot(now);
 if(slot){
  const{data:exists}=await supabaseAdmin.from("forecast_snapshots").select("instrument").eq("session_date",slot.date).eq("slot",slot.slot).eq("model_version",FORECAST_VERSION);
  if((exists?.length??0)<3){const context=await fetchForecastContext(now);for(const market of context.markets){if(exists?.some(r=>r.instrument===market.instrument))continue;
   const {error}=await supabaseAdmin.from("forecast_snapshots").insert({session_date:slot.date,instrument:market.instrument,slot:slot.slot,scheduled_at:now.toISOString(),issued_at:now.toISOString(),model_version:FORECAST_VERSION,status:"no_reliable_forecast",reason:market.stale?"STALE_OR_MISSING_DATA":"UNVALIDATED_MODEL",inputs:market as any,output:{status:"NO RELIABLE FORECAST",context:market.context,confidence:null,forecast:null,leadership:context.leadership,calendarVerified:false,licensingVerified:false} as any});
   if(error&&error.code!=="23505")console.error("Forecast snapshot not saved",error.code);
  }}
 }
 // Save actual endpoint observations only. No predictions/accuracy are claimed by this context model.
 const{data:snapshots,error}=await supabaseAdmin.from("forecast_snapshots").select("*").gte("issued_at",new Date(now.getTime()-48*3600000).toISOString()).lte("issued_at",new Date(now.getTime()-45*60000).toISOString()).order("issued_at").limit(30);
 if(error||!snapshots?.length)return;
 const{data:outcomes}=await supabaseAdmin.from("forecast_outcomes").select("snapshot_id,horizon_minutes").in("snapshot_id",snapshots.map(s=>s.id));
 const cache=new Map<string,Awaited<ReturnType<typeof sourceBars>>>();
 for(const s of snapshots){if([30,45].every(h=>outcomes?.some(o=>o.snapshot_id===s.id&&o.horizon_minutes===h)))continue;
  let bars=cache.get(s.instrument);if(!bars){bars=await sourceBars(s.instrument+"=F","5m",now);cache.set(s.instrument,bars);}
  const issued=Date.parse(s.issued_at)/1000,inputs=s.inputs as any,price=inputs?.context?.execution?.price;
  for(const horizon of[30,45]){if(outcomes?.some(o=>o.snapshot_id===s.id&&o.horizon_minutes===horizon))continue;const end=issued+horizon*60,observation=bars.find(b=>b.t+300>=end&&b.t+300<end+300);if(!observation)continue;
   const{error:saveError}=await supabaseAdmin.from("forecast_outcomes").insert({snapshot_id:s.id,horizon_minutes:horizon,observed_at:new Date((observation.t+300)*1000).toISOString(),actual:{close:observation.c,returnPct:typeof price==="number"?(observation.c/price-1)*100:null,scorable:false,reason:"NO_VALIDATED_PREDICTION",source:s.instrument+"=F"} as any});if(saveError&&saveError.code!=="23505")console.error("Forecast outcome not saved",saveError.code);
  }
 }
}
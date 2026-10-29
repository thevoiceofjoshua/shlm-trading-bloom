import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess } from "@/lib/hub.functions";
export const getForecastWorkspace=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 if(!(await checkAccess(context)).hasAccess)throw new Error("Centre membership required.");
 const{fetchForecastContext}=await import("@/lib/forecast-data.server");
 const[read,snapshots,validations]=await Promise.all([fetchForecastContext(),context.supabase.from("forecast_snapshots").select("id,session_date,instrument,slot,issued_at,status,reason,output").order("issued_at",{ascending:false}).limit(60),context.supabase.from("forecast_validations").select("*").order("evaluated_at",{ascending:false}).limit(3)]);
 if(snapshots.error||validations.error)throw new Error("Forecast evidence could not be loaded.");
 const ids=(snapshots.data??[]).map(s=>s.id);const outcomes=ids.length?await context.supabase.from("forecast_outcomes").select("*").in("snapshot_id",ids):{data:[],error:null};
 if(outcomes.error)throw new Error("Outcomes could not be loaded.");
 return{computedAt:read.computedAt,markets:read.markets.map(({bars,...market})=>market),leadership:read.leadership,snapshots:snapshots.data??[],outcomes:outcomes.data??[],validations:validations.data??[]};
});
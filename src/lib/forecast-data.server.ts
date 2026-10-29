import { getJson } from "@/lib/quotes.server";
import { aggregateBars,completeBars,nearbySetup,relationship,type Candle } from "@/lib/forecast-rules";
export async function sourceBars(symbol:string,interval:"5m"|"60m",cutoff:Date){
 const json=await getJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${interval==="60m"?"3mo":"5d"}&includePrePost=true`);
 const r=json?.chart?.result?.[0],q=r?.indicators?.quote?.[0],rows:Candle[]=[];
 if(!r||!q)return rows;
 (r.timestamp??[]).forEach((t:number,i:number)=>{const o=q.open?.[i],h=q.high?.[i],l=q.low?.[i],c=q.close?.[i];if([o,h,l,c].every((x)=>typeof x==="number"&&Number.isFinite(x))&&h>=l)rows.push({t,o,h,l,c,v:typeof q.volume?.[i]==="number"?q.volume[i]:null});});
 return completeBars(rows,interval==="60m"?60:5,cutoff.getTime()/1000);
}
export async function fetchForecastContext(now=new Date()){
 const instruments=["NQ","YM","GC"] as const;
 const reads=await Promise.all(instruments.map(async instrument=>{const[m5,h1]=await Promise.all([sourceBars(instrument+"=F","5m",now),sourceBars(instrument+"=F","60m",now)]);const m15=aggregateBars(m5,5,15),h4=aggregateBars(h1,60,240),last=m5.at(-1);const stale=!last||now.getTime()/1000-(last.t+300)>25*60;return{instrument,source:instrument+"=F",continuousContract:true,delayMinutes:15,asOf:last?new Date((last.t+300)*1000).toISOString():null,stale,bars:{m5,m15,h1,h4},context:stale?null:nearbySetup(m5,m15,h1,h4)};}));
 const n=reads.find(r=>r.instrument==="NQ"),y=reads.find(r=>r.instrument==="YM");
 return{computedAt:now.toISOString(),markets:reads,leadership:n&&!n.stale&&y&&!y.stale?relationship(n.bars.m5,y.bars.m5):null};
}
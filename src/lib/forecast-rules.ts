export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number | null };
export const FORECAST_VERSION = "shlm-context-v1";
export const SNAPSHOT_SLOTS = ["05:00", "06:25", "17:00"] as const;
export function pacificClock(now: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(now);
  const value = (key: string) => p.find(x => x.type === key)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}`, weekday: value("weekday") };
}
export function snapshotSlot(now: Date) {
  const clock = pacificClock(now);
  if (clock.weekday === "Sat" || clock.weekday === "Sun" && clock.time !== "17:00" || clock.weekday === "Fri" && clock.time === "17:00") return null;
  const slot = SNAPSHOT_SLOTS.find(s => s === clock.time);
  if (!slot) return null;
  const date = slot === "17:00" ? new Date(Date.parse(clock.date + "T12:00:00Z") + 86400000).toISOString().slice(0, 10) : clock.date;
  return { date, slot };
}
export function completeBars(bars: Candle[], intervalMinutes: number, cutoff: number) { return bars.filter(b => b.t + intervalMinutes * 60 <= cutoff && [b.o,b.h,b.l,b.c].every(Number.isFinite)); }
export function aggregateBars(bars: Candle[], sourceMinutes: number, targetMinutes: number): Candle[] {
  const size = targetMinutes / sourceMinutes, buckets = new Map<number,Candle[]>();
  for (const b of bars) { const start = Math.floor(b.t / (targetMinutes * 60)) * targetMinutes * 60; const group = buckets.get(start) ?? []; group.push(b); buckets.set(start,group); }
  const out:Candle[]=[];
  for(const[t,group]of buckets){ group.sort((a,b)=>a.t-b.t); const first=group[0],last=group.at(-1);if(!first||!last||group.length!==size||first.t!==t||group.some((b,i)=>b.t!==t+i*sourceMinutes*60))continue;out.push({t,o:first.o,h:Math.max(...group.map(b=>b.h)),l:Math.min(...group.map(b=>b.l)),c:last.c,v:group.every(b=>b.v!==null)?group.reduce((s,b)=>s+(b.v??0),0):null}); }
  return out.sort((a,b)=>a.t-b.t);
}
export function summarizeTimeframe(bars:Candle[]){
  if(bars.length<20)return null;
  const recent=bars.slice(-20),first=recent[0],last=recent.at(-1);if(!first||!last)return null;
  const ranges=recent.slice(1).map((b,i)=>Math.max(b.h-b.l,Math.abs(b.h-(recent[i]?.c??b.o)),Math.abs(b.l-(recent[i]?.c??b.o))));
  const atr=ranges.reduce((s,r)=>s+r,0)/ranges.length;
  const move=last.c-first.o;
  const efficiency=Math.abs(move)/(recent.reduce((sum,b)=>sum+Math.abs(b.c-b.o),0)||1);
  return{price:last.c,atr,returnPct:(last.c/first.o-1)*100,momentum:move,efficiency,direction:Math.abs(move)<atr*0.3?"neutral":move>0?"bullish":"bearish",high:Math.max(...recent.map(b=>b.h)),low:Math.min(...recent.map(b=>b.l)),lastBar:last.t};
}
export function nearbySetup(m5:Candle[],m15:Candle[],h1:Candle[],h4:Candle[]){
  const execution=summarizeTimeframe(m5),setup=summarizeTimeframe(m15),hour=summarizeTimeframe(h1),four=summarizeTimeframe(h4);
  if(!execution||!setup||!hour||!four)return null;
  const price=execution.price;
  const upper=[...m5.slice(-36),...m15.slice(-12)].map(b=>b.h).filter(p=>p>price).sort((a,b)=>a-b)[0]??null;
  const lower=[...m5.slice(-36),...m15.slice(-12)].map(b=>b.l).filter(p=>p<price).sort((a,b)=>b-a)[0]??null;
  const scalp=execution.direction, countertrend=scalp!=="neutral"&&four.direction!=="neutral"&&scalp!==four.direction;
  const target=scalp==="bullish"?upper:scalp==="bearish"?lower:null;
  const invalidation=scalp==="bullish"?lower:scalp==="bearish"?upper:null;
  const distance=target===null?null:Math.abs(target-price);
  // Realized six/nine-bar range gives a descriptive horizon reference, not a target guarantee.
  const windows=(n:number)=>m5.slice(-72).map((_,i,all)=>all.slice(i,i+n)).filter(w=>w.length===n).map(w=>Math.max(...w.map(b=>b.h))-Math.min(...w.map(b=>b.l)));
  const ranges=windows(9),horizonRange=ranges.length?ranges.reduce((s,n)=>s+n,0)/ranges.length:null;
  const scenario=execution.efficiency<0.25?"RANGE ROTATION":countertrend?"COUNTERTREND REVERSAL":scalp==="bullish"?"BULLISH CONTINUATION":scalp==="bearish"?"BEARISH CONTINUATION":"COMPRESSION / BREAKOUT WATCH";
  return{execution,setup,hour,four,upper,lower,target,invalidation,countertrend,scenario,horizonRange,unrealistic:distance!==null&&horizonRange!==null&&distance>horizonRange,confirmation:scalp==="bullish"?"Closed 5M candle above the nearby upper level with 15M follow-through":scalp==="bearish"?"Closed 5M candle below the nearby lower level with 15M follow-through":"Wait for a closed 5M break and 15M follow-through",source:"Continuous futures OHLCV; inferred liquidity, not verified resting orders",horizonMinutes:[30,45],confidence:"Unvalidated context — not a calibrated probability"};
}
export function relationship(nq:Candle[],ym:Candle[]){
  const byTime=new Map(ym.map(b=>[b.t,b])),paired=nq.filter(b=>byTime.has(b.t)).slice(-36);
  if(paired.length<12)return null;
  const first=paired[0],last=paired.at(-1);if(!first||!last)return null;
  const yf=byTime.get(first.t),yl=byTime.get(last.t);if(!yf||!yl)return null;
  const nr=(last.c/first.o-1)*100,yr=(yl.c/yf.o-1)*100;
  const vol=(bs:Candle[])=>{const changes=bs.slice(1).map((b,i)=>b.c/(bs[i]?.c??b.c)-1),mean=changes.reduce((s,x)=>s+x,0)/changes.length;return Math.sqrt(changes.reduce((s,x)=>s+(x-mean)**2,0)/changes.length)*100;};
  const nVol=vol(paired),yVol=vol(paired.map(b=>byTime.get(b.t)).filter((b):b is Candle=>!!b));
  return{leader:nr>yr?"NASDAQ":yr>nr?"US30":"Balanced",nqReturnPct:nr,ymReturnPct:yr,spreadPct:nr-yr,nqVolatility:nVol,ymVolatility:yVol,nqNormalized:nVol?nr/nVol:null,ymNormalized:yVol?yr/yVol:null,from:first.t,to:last.t,observations:paired.length};
}
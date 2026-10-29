import { describe,it,expect } from "vitest";
import { aggregateBars,completeBars,nearbySetup,snapshotSlot,relationship,type Candle } from "./forecast-rules";
const bars=(n:number,start=0):Candle[]=>Array.from({length:n},(_,i)=>({t:start+i*300,o:100+i,h:102+i,l:99+i,c:101+i,v:10}));
describe("forecast data integrity",()=>{
 it("uses Pacific 17:00, 05:00 and 06:25 slots",()=>{expect(snapshotSlot(new Date("2026-10-30T00:00:00Z"))).toEqual({date:"2026-10-30",slot:"17:00"});expect(snapshotSlot(new Date("2026-10-29T12:00:00Z"))?.slot).toBe("05:00");expect(snapshotSlot(new Date("2026-10-29T13:25:00Z"))?.slot).toBe("06:25");expect(snapshotSlot(new Date("2026-10-29T13:26:00Z"))).toBeNull();});
 it("adjusts snapshot time for DST",()=>{expect(snapshotSlot(new Date("2026-11-02T13:00:00Z"))?.slot).toBe("05:00");});
 it("omits weekend and Friday-evening issues",()=>{expect(snapshotSlot(new Date("2026-10-31T00:00:00Z"))).toBeNull();expect(snapshotSlot(new Date("2026-11-01T13:00:00Z"))).toBeNull();});
 it("does not include still-open or future bars",()=>{expect(completeBars(bars(3),5,600).map(b=>b.t)).toEqual([0,300]);});
 it("never fills incomplete aggregation groups",()=>{expect(aggregateBars(bars(11),5,60)).toEqual([]);expect(aggregateBars(bars(12),5,60)[0]?.v).toBe(120);expect(aggregateBars(bars(12).filter((_,i)=>i!==5),5,60)).toEqual([]);});
 it("requires genuine observations for every timeframe",()=>{expect(nearbySetup(bars(20),bars(20),bars(20),[])).toBeNull();});
 it("does not invent a relationship without synchronized observations",()=>{expect(relationship(bars(20),bars(20,100))).toBeNull();expect(relationship(bars(20),bars(20))?.spreadPct).toBe(0);});
});
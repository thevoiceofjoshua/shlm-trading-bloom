import { useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHARACTERS, CHARACTER_GUIDE, MONTHS, calendarFlags, characterMix, dayStats, monthRank, monthStats, weekdays } from "@/lib/seasonality";
import type { SeasonalityResponse } from "@/lib/seasonality.functions";

const percent = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const MIX_CLASSES = ["fill-muted-foreground", "fill-border", "fill-foreground/60", "fill-foreground"];

function Collecting() {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center"><span className="h-2 w-2 rounded-full bg-muted-foreground" /><p className="font-display text-lg">Collecting data</p><p className="text-xs text-muted-foreground">No verified history loaded for this selection.</p></div>;
}

function Estimated({ show }: { show: boolean }) {
  return show ? <span className="ml-2 rounded-full border border-border px-2 py-0.5 align-middle text-[10px] uppercase tracking-wide text-muted-foreground" title="Character estimated from daily range and volume">Estimated</span> : null;
}

function MixBar({ mix }: { mix: ReturnType<typeof characterMix> }) {
  let x = 0;
  return <div className="mt-4"><svg viewBox="0 0 100 3" preserveAspectRatio="none" className="h-3 w-full" role="img" aria-label="Historical character mix">{mix.map((m, i) => { const start = x; x += m.pct ?? 0; return <rect key={m.character} x={start} width={m.pct ?? 0} height={3} className={MIX_CLASSES[i]}><title>{m.character}: {m.pct?.toFixed(1) ?? "No data"}%</title></rect>; })}</svg><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{mix.map(m => <p key={m.character} className="text-xs capitalize text-muted-foreground">{m.character} <span className="text-foreground">{m.pct == null ? "—" : `${m.pct.toFixed(1)}%`}</span></p>)}</div></div>;
}

function HistoryGraph({ labels, values, selected, onSelect, categorical = false }: { labels: string[]; values: (number | null)[]; selected: number; onSelect: (i: number) => void; categorical?: boolean }) {
  const left = categorical ? 100 : 60, right = 770, top = 24, bottom = 220;
  const available = values.filter((v): v is number => v !== null);
  const min = categorical ? 0 : Math.min(0, ...available), max = categorical ? 3 : Math.max(0, ...available);
  const spread = max - min || 1;
  const px = (i: number) => left + i / Math.max(1, labels.length - 1) * (right - left);
  const py = (v: number) => bottom - (v - min) / spread * (bottom - top);
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width * 800;
    onSelect(Math.max(0, Math.min(labels.length - 1, Math.round((x - left) / (right - left) * (labels.length - 1)))));
  };
  const levels = categorical ? [3, 2, 1, 0] : [max, min + spread / 2, min];
  return <div className="overflow-x-auto"><svg viewBox="0 0 800 270" className="min-w-[650px] w-full touch-pan-y" role="slider" tabIndex={0} aria-label={categorical ? "Selected date" : "Selected month"} aria-valuemin={1} aria-valuemax={labels.length} aria-valuenow={selected + 1} aria-valuetext={labels[selected]} onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onSelect(Math.max(0, Math.min(labels.length - 1, selected + (e.key === "ArrowRight" ? 1 : -1)))); } }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e); }} onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>
    {levels.map((v, i) => <g key={i}><line x1={left} x2={right} y1={py(v)} y2={py(v)} className="stroke-border" /><text x={left - 10} y={py(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{categorical ? CHARACTERS[v] : `${v.toFixed(1)}%`}</text></g>)}
    {values.map((v, i) => { const prior = values[i - 1]; return v !== null && i > 0 && prior != null ? <line key={i} x1={px(i - 1)} y1={py(prior)} x2={px(i)} y2={py(v)} className="stroke-foreground" strokeWidth={2} /> : null; })}
    {values.map((v, i) => v !== null ? <circle key={i} cx={px(i)} cy={py(v)} r={i === selected ? 7 : 3} className="fill-foreground stroke-background" strokeWidth={2}><title>{labels[i]}: {categorical ? CHARACTERS[v] : percent(v)}</title></circle> : null)}
    <line x1={px(selected)} x2={px(selected)} y1={top} y2={bottom} className="stroke-muted-foreground" strokeDasharray="3 5" />
    {labels.map((label, i) => <text key={i} x={px(i)} y={247} textAnchor="middle" className={i === selected ? "fill-foreground text-[11px] font-semibold" : "fill-muted-foreground text-[10px]"}>{label}</text>)}
  </svg></div>;
}

export function SeasonalityView({ data }: { data: SeasonalityResponse }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(0);
  const monthly = MONTHS.map((_, i) => monthStats(data.history, data.coverage, i + 1));
  const stats = monthly[month - 1];
  const dates = weekdays(year, month).filter(date => !calendarFlags(date, data.calendar).closed);
  const index = Math.min(selectedDay, Math.max(0, dates.length - 1));
  const date = dates[index];
  const day = date ? dayStats(data.history, date) : null;
  const flags = date ? calendarFlags(date, data.calendar) : null;
  const guide = day?.character ? CHARACTER_GUIDE[day.character] : null;
  const monthRows = data.history.filter(r => Number(r.date.slice(5, 7)) === month);
  const changeMonth = (next: number) => { if (next < 1) { setYear(y => y - 1); setMonth(12); } else if (next > 12) { setYear(y => y + 1); setMonth(1); } else setMonth(next); setSelectedDay(0); };
  const rank = monthRank(data.history, data.coverage, month);
  const hasMonthly = monthly.some(Boolean);
  const anyEstimated = (rows: { estimated?: boolean }[]) => rows.some(r => r.estimated !== false);
  const hasDaily = dates.some(d => dayStats(data.history, d).sample.length > 0);
  return <div className="mt-8 space-y-10">
    <section className="border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl">Average return by month</h2><span className="text-xs text-muted-foreground">Verified complete months · open to close</span></div>
      {hasMonthly ? <HistoryGraph labels={MONTHS} values={monthly.map(s => s?.average ?? null)} selected={month - 1} onSelect={i => { setMonth(i + 1); setSelectedDay(0); }} /> : <Collecting />}
      <div className="flex flex-wrap gap-1" aria-label="Month">{MONTHS.map((m, i) => <Button key={m} variant={i + 1 === month ? "default" : "ghost"} size="sm" aria-pressed={i + 1 === month} onClick={() => { setMonth(i + 1); setSelectedDay(0); }}>{m}</Button>)}</div>
      {stats ? <><div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">{[
        ["Average return", percent(stats.average)], ["Up years", `${stats.upPct.toFixed(1)}%`], ["Best year", stats.best ? `${stats.best.year} · ${percent(stats.best.value)}` : "—"], ["Worst year", stats.worst ? `${stats.worst.year} · ${percent(stats.worst.value)}` : "—"], ["Rank of 12", rank == null ? "Collecting data" : `${rank} / 12`],
      ].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-display text-lg">{value}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">{stats.count} complete recorded year{stats.count === 1 ? "" : "s"} for {MONTHS[month - 1]}.</p></> : hasMonthly ? <Collecting /> : null}
      {monthRows.length > 0 && <div className="mt-6"><h3 className="text-sm font-medium">{MONTHS[month - 1]} character mix<Estimated show={anyEstimated(monthRows)} /></h3><MixBar mix={characterMix(monthRows)} /><p className="mt-2 text-xs text-muted-foreground">{monthRows.length} recorded sessions, including any partial years.</p></div>}
    </section>
    <section className="border-t border-border pt-6">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl">{MONTHS[month - 1]} {year} · daily character<Estimated show={anyEstimated(data.history)} /></h2><div className="flex gap-1"><Button variant="outline" size="icon" title="Previous month" aria-label="Previous month" onClick={() => changeMonth(month - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" title="Next month" aria-label="Next month" onClick={() => changeMonth(month + 1)}><ChevronRight /></Button></div></div>
      {hasDaily ? <HistoryGraph categorical labels={dates.map(d => String(Number(d.slice(8))))} values={dates.map(d => { const c = dayStats(data.history, d).character; return c ? CHARACTERS.indexOf(c) : null; })} selected={index} onSelect={setSelectedDay} /> : <Collecting />}
      <div className="flex flex-wrap gap-1" aria-label="Selected date">{dates.map((d, i) => <Button key={d} variant={i === index ? "default" : "ghost"} size="sm" onClick={() => setSelectedDay(i)} aria-pressed={i === index} title={d}>{Number(d.slice(8))}</Button>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Calendar-date patterns across recorded years. Weekends excluded; known exchange holidays excluded when verified calendar records exist. Gaps mean no history or tied characters.</p>
    </section>
    {date && <section className="border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-xl">{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</h2><span className="text-xs text-muted-foreground">{day?.sample.length ? `${day.sample.length} historical observations` : "Collecting data"}</span></div>
      {day?.sample.length ? <><p className="mt-5 text-xs uppercase text-muted-foreground">Typical character<Estimated show={anyEstimated(day.sample)} /></p><p className="mt-1 font-display text-3xl capitalize">{day.character ?? "Mixed · tied history"}</p><MixBar mix={day.mix} />
      {guide && <div className="mt-8 grid gap-8 md:grid-cols-2"><div><h3 className="font-display text-lg">Why it tends to be that character</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guide.causes}</p></div><div><h3 className="font-display text-lg">Is it a tradable day</h3><p className="mt-3 font-medium">{guide.verdict}</p><p className="mt-3 text-xs text-muted-foreground">Tradable odds {day.odds == null ? "· Collecting data — requires verified tradability observations" : `· ${day.odds.toFixed(1)}% of ${day.oddsCount} assessed sessions`}</p>{day.odds != null && <svg viewBox="0 0 100 3" className="mt-3 h-3 w-full" role="img" aria-label={`Tradable odds ${day.odds.toFixed(1)} percent`}><rect width={100} height={3} className="fill-muted" /><rect width={day.odds} height={3} className="fill-foreground" /></svg>}</div><div><h3 className="font-display text-lg">What to do</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">{guide.do.map(t => <li key={t}>{t}</li>)}</ul></div><div><h3 className="font-display text-lg">What to avoid</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">{guide.avoid.map(t => <li key={t}>{t}</li>)}</ul></div></div>}
      <p className="mt-6 text-sm text-muted-foreground">Second most likely character: <span className="capitalize text-foreground">{day.second ?? "No second character recorded"}</span></p></> : <Collecting />}
      <div className="mt-6 border-t border-border pt-4"><h3 className="text-sm font-medium">On this date</h3><p className="mt-2 text-sm text-muted-foreground">{flags?.flags.join(" · ") || "No verified calendar flags recorded."}</p>{!flags?.calendarVerified && <p className="mt-2 text-xs text-muted-foreground">Release dates and first/last trading-day flags await a verified calendar.</p>}</div>
      <p className="mt-5 text-xs text-muted-foreground">Historical context is not a forecast or an entry signal. Confirm current conditions and follow your risk rules.</p>
    </section>}
    {anyEstimated(data.history) && <p className="border-t border-border pt-4 text-xs text-muted-foreground">Estimated: characters marked Estimated are derived from each day's range versus its recent average range and its volume versus recent average volume (choppy = a wide range with a small open-to-close move). Real Day Character labels replace estimates where they exist. Monthly returns and up years use real daily prices.</p>}
    {data.history.length > 0 && <p className="border-t border-border pt-4 text-xs text-muted-foreground">Sources: {[...new Set(data.history.map(r => r.source))].join(" · ")} · {data.history[0]?.date} to {data.history.at(-1)?.date}</p>}
  </div>;
}
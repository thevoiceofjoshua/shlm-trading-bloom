/**
 * Session-window helpers for the SHLM Centre.
 *
 * Session windows are defined in LA (Pacific) time per `SITE_TIMEZONE`.
 * All *displayed* times are converted to the viewer's local time zone at
 * render — these helpers compute state, not display strings.
 */

import { SESSIONS, type SessionKey, type SessionWindow } from "@/lib/market-data";
import { SITE_TIMEZONE } from "@/lib/time";

/** Returns the components in LA time for a given Date. */
function laParts(now: Date): { day: number; h: number; m: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayMap[get("weekday")] ?? 0,
    h: parseInt(get("hour"), 10) % 24,
    m: parseInt(get("minute"), 10),
  };
}

function inWindow(now: Date, s: SessionWindow): boolean {
  const { day, h, m } = laParts(now);
  if (!s.days.includes(day)) return false;
  const cur = h * 60 + m;
  const start = s.startH * 60 + s.startM;
  const end = s.endH * 60 + s.endM;
  return cur >= start && cur < end;
}

function minutesUntilOpen(now: Date, s: SessionWindow): number | null {
  const { day, h, m } = laParts(now);
  const cur = h * 60 + m;
  const start = s.startH * 60 + s.startM;
  if (!s.days.includes(day)) {
    // find next market day
    let d = day;
    let add = 0;
    while (!s.days.includes(d)) {
      d = (d + 1) % 7;
      add++;
    }
    return add * 24 * 60 - cur + start;
  }
  if (cur < start) return start - cur;
  return null; // currently open or after close — next window is another day
}

export interface SessionStatus {
  key: SessionKey;
  label: string;
  pairs: string[];
  state: "open" | "upcoming" | "closed";
  countdown: string | null;
}

export function sessionStatuses(now: Date = new Date()): { sessions: SessionStatus[]; marketsClosed: boolean; nextNote: string | null } {
  const { day } = laParts(now);
  const isWeekend = day === 0 || day === 6;
  const sessions = SESSIONS.map((s) => {
    const open = inWindow(now, s);
    if (open) {
      return { key: s.key, label: s.label, pairs: s.pairs, state: "open" as const, countdown: null };
    }
    const mins = minutesUntilOpen(now, s);
    if (mins !== null && mins < 24 * 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return {
        key: s.key,
        label: s.label,
        pairs: s.pairs,
        state: "upcoming" as const,
        countdown: `opens in ${h}h ${m}m`,
      };
    }
    return { key: s.key, label: s.label, pairs: s.pairs, state: "closed" as const, countdown: null };
  });

  const marketsClosed = isWeekend;
  let nextNote: string | null = null;
  if (isWeekend) {
    nextNote = "Markets closed — next session Monday 6:30am PST.";
  }

  return { sessions, marketsClosed, nextNote };
}

/** Convert a PST time-of-day to the viewer's local time zone for display. */
export function pstToLocalTime(h: number, m: number): string {
  // Build a Date for today in LA at the given h:m, then format in viewer TZ.
  const now = new Date();
  const laStr = now.toLocaleString("en-US", { timeZone: SITE_TIMEZONE });
  const laNow = new Date(laStr);
  const d = new Date(laNow);
  d.setHours(h, m, 0, 0);
  // Format in viewer's local time
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Convert an ISO date + LA-time "HH:MM" into a viewer-local time string. */
export function econTimeToLocal(dateISO: string, laTime: string): string {
  const [hStr, mStr] = laTime.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  // Construct a Date in LA TZ for the given date+time
  const date = new Date(`${dateISO}T00:00:00`);
  const laStr = date.toLocaleString("en-US", { timeZone: SITE_TIMEZONE });
  const laDate = new Date(laStr);
  laDate.setHours(h, m, 0, 0);
  return laDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

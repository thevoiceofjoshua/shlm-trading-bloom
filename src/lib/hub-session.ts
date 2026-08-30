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
  // Search today through the next 7 days for the next start that is still ahead.
  for (let add = 0; add <= 7; add++) {
    const d = (day + add) % 7;
    if (!s.days.includes(d)) continue;
    const mins = add * 24 * 60 - cur + start;
    if (mins > 0) return mins;
  }
  return null;
}


export interface SessionStatus {
  key: SessionKey;
  label: string;
  pairs: string[];
  state: "open" | "upcoming" | "closed";
  countdown: string | null;
}

/**
 * The market week itself: opens Sunday 3:00pm PST and closes Friday 2:00pm PST.
 * This is separate from the SHLM session windows (6:30am / 5:00pm PST, Mon–Fri).
 */
export const MARKET_OPEN = { day: 0, h: 15, m: 0 } as const;
export const MARKET_CLOSE = { day: 5, h: 14, m: 0 } as const;

/** True when the market week is open at `now` (LA reference). */
export function marketWeekOpen(now: Date = new Date()): boolean {
  const { day, h, m } = laParts(now);
  const cur = h * 60 + m;
  const open = MARKET_OPEN.h * 60 + MARKET_OPEN.m;
  const close = MARKET_CLOSE.h * 60 + MARKET_CLOSE.m;
  // Week runs Sun 15:00 → Fri 14:00 (LA).
  if (day === 6) return false; // Saturday
  if (day === 0) return cur >= open; // Sunday before 3:00pm is closed
  if (day === 5) return cur < close; // Friday after 2:00pm is closed
  return true;

}

export function sessionStatuses(now: Date = new Date()): { sessions: SessionStatus[]; marketsClosed: boolean; nextNote: string | null } {
  const weekOpen = marketWeekOpen(now);
  const sessions = SESSIONS.map((s) => {
    const open = weekOpen && inWindow(now, s);
    if (open) {
      return { key: s.key, label: s.label, pairs: s.pairs, state: "open" as const, countdown: null };
    }
    const mins = minutesUntilOpen(now, s);
    if (mins !== null) {

      const d = Math.floor(mins / (24 * 60));
      const h = Math.floor((mins % (24 * 60)) / 60);
      const m = mins % 60;
      return {
        key: s.key,
        label: s.label,
        pairs: s.pairs,
        state: "upcoming" as const,
        countdown: d > 0 ? `opens in ${d}d ${h}h ${m}m` : `opens in ${h}h ${m}m`,
      };
    }

    return { key: s.key, label: s.label, pairs: s.pairs, state: "closed" as const, countdown: null };
  });

  const marketsClosed = !weekOpen;
  let nextNote: string | null = null;
  if (marketsClosed) {
    nextNote = `Market closed — it reopens Sunday at ${pstToLocalTime(MARKET_OPEN.h, MARKET_OPEN.m)} your time (3:00pm PST). First SHLM session is Monday at ${pstToLocalTime(6, 30)} (6:30am PST).`;
  }

  return { sessions, marketsClosed, nextNote };
}


/**
 * Convert a wall-clock time in SITE_TIMEZONE (LA) into the exact UTC instant.
 * Works by probing the LA offset for that approximate instant.
 */
function laWallClockToDate(year: number, month: number, day: number, h: number, m: number): Date {
  // First guess: treat the wall clock as UTC, then correct by the LA offset.
  const guess = Date.UTC(year, month - 1, day, h, m, 0, 0);
  const offsetMs = laOffsetMs(new Date(guess));
  // Refine once (handles DST boundaries).
  const refined = guess - offsetMs;
  const offset2 = laOffsetMs(new Date(refined));
  return new Date(guess - offset2);
}

/** LA UTC offset in ms at a given instant (negative west of UTC). */
function laOffsetMs(at: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUTC - at.getTime();
}

/** Convert a PST time-of-day (today in LA) to the viewer's local time zone for display. */
export function pstToLocalTime(h: number, m: number): string {
  const now = new Date();
  const laDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  const [y, mo, d] = laDateParts.split("-").map((v) => parseInt(v, 10));
  const instant = laWallClockToDate(y, mo, d, h, m);
  return instant.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Convert an ISO date + LA-time "HH:MM" into a viewer-local time string. */
export function econTimeToLocal(dateISO: string, laTime: string): string {
  const [hStr, mStr] = laTime.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const [y, mo, d] = dateISO.split("-").map((v) => parseInt(v, 10));
  const instant = laWallClockToDate(y, mo, d, h, m);
  return instant.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}


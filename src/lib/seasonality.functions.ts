import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess, type HubAccess } from "@/lib/hub.functions";
import type { HistoryRow, CoverageRow, CalendarRow, SeasonalitySymbol } from "@/lib/seasonality";

export interface SeasonalityResponse { access: HubAccess; history: HistoryRow[]; coverage: CoverageRow[]; calendar: CalendarRow[] }
export const getSeasonality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: SeasonalitySymbol; asMember?: boolean }) => {
    if (input.symbol !== "NQ" && input.symbol !== "YM") throw new Error("Invalid symbol");
    return { symbol: input.symbol, asMember: input.asMember === true };
  })
  .handler(async ({ context, data }): Promise<SeasonalityResponse> => {
    const resolved = await checkAccess(context);
    const access = data.asMember ? { hasAccess: resolved.memberAccess, isAdmin: false, memberAccess: resolved.memberAccess } : resolved;
    if (!access.hasAccess) return { access, history: [], coverage: [], calendar: [] };
    // User-scoped reads retain table RLS. Paginate every source past PostgREST's 1,000-row limit.
    const history: HistoryRow[] = [], coverage: CoverageRow[] = [], calendar: CalendarRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await context.supabase.from("seasonality_history").select("symbol,date,character,open,high,low,close,volume,source,tradable,tradability_evidence,estimated").eq("symbol", data.symbol).order("date").range(offset, offset + 999);
      if (r.error) throw r.error;
      history.push(...(r.data ?? []) as HistoryRow[]);
      if ((r.data?.length ?? 0) < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const r = await context.supabase.from("seasonality_month_coverage").select("symbol,year,month,complete,source").eq("symbol", data.symbol).order("year").order("month").range(offset, offset + 999);
      if (r.error) throw r.error;
      coverage.push(...(r.data ?? []) as CoverageRow[]);
      if ((r.data?.length ?? 0) < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const r = await context.supabase.from("seasonality_calendar").select("date,is_trading_day,jobs_report,first_trading_day,last_trading_day,options_expiry,source").order("date").range(offset, offset + 999);
      if (r.error) throw r.error;
      calendar.push(...(r.data ?? []) as CalendarRow[]);
      if ((r.data?.length ?? 0) < 1000) break;
    }
    return { access, history, coverage, calendar };
  });
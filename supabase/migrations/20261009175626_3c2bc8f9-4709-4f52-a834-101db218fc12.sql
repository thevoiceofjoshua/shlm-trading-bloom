CREATE FUNCTION public.can_read_seasonality() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','shlm_mod','free_member','recruiter'))
 OR EXISTS (SELECT 1 FROM public.purchases WHERE status = 'paid' AND (user_id = auth.uid() OR email = (auth.jwt()->>'email')))
 );
$$;
REVOKE ALL ON FUNCTION public.can_read_seasonality() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_seasonality() TO authenticated, service_role;
CREATE TABLE public.seasonality_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 symbol text NOT NULL CHECK (symbol IN ('NQ','YM')),
 date date NOT NULL,
 character text NOT NULL CHECK (character IN ('range bound','slow','choppy','fast')),
 open numeric NOT NULL CHECK (open > 0), high numeric NOT NULL, low numeric NOT NULL, close numeric NOT NULL CHECK (close > 0), volume numeric NOT NULL CHECK (volume >= 0),
 source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(symbol,date), CHECK(high >= greatest(open,close,low)), CHECK(low <= least(open,close,high)), CHECK(extract(isodow FROM date) BETWEEN 1 AND 5)
);
GRANT SELECT ON public.seasonality_history TO authenticated;
GRANT ALL ON public.seasonality_history TO service_role;
ALTER TABLE public.seasonality_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre access reads seasonality history" ON public.seasonality_history FOR SELECT TO authenticated USING(public.can_read_seasonality());
CREATE TRIGGER seasonality_history_updated_at BEFORE UPDATE ON public.seasonality_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.seasonality_month_coverage (
 symbol text NOT NULL CHECK(symbol IN ('NQ','YM')), year integer NOT NULL, month smallint NOT NULL CHECK(month BETWEEN 1 AND 12), complete boolean NOT NULL DEFAULT false, source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(symbol,year,month)
);
GRANT SELECT ON public.seasonality_month_coverage TO authenticated;
GRANT ALL ON public.seasonality_month_coverage TO service_role;
ALTER TABLE public.seasonality_month_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre access reads month coverage" ON public.seasonality_month_coverage FOR SELECT TO authenticated USING(public.can_read_seasonality());
CREATE TRIGGER seasonality_month_coverage_updated_at BEFORE UPDATE ON public.seasonality_month_coverage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.seasonality_calendar (
 date date PRIMARY KEY, is_trading_day boolean NOT NULL,
 jobs_report boolean NOT NULL DEFAULT false, first_trading_day boolean NOT NULL DEFAULT false, last_trading_day boolean NOT NULL DEFAULT false, options_expiry boolean NOT NULL DEFAULT false,
 source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasonality_calendar TO authenticated;
GRANT ALL ON public.seasonality_calendar TO service_role;
ALTER TABLE public.seasonality_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre access reads seasonality calendar" ON public.seasonality_calendar FOR SELECT TO authenticated USING(public.can_read_seasonality());
CREATE TRIGGER seasonality_calendar_updated_at BEFORE UPDATE ON public.seasonality_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
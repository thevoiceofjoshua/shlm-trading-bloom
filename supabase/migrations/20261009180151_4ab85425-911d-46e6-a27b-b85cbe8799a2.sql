REVOKE ALL ON public.seasonality_history, public.seasonality_month_coverage, public.seasonality_calendar FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.seasonality_history, public.seasonality_month_coverage, public.seasonality_calendar TO authenticated;
GRANT ALL ON public.seasonality_history, public.seasonality_month_coverage, public.seasonality_calendar TO service_role;
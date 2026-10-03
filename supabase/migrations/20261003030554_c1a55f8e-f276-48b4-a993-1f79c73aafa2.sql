DROP POLICY IF EXISTS "Signed-in members can read daily levels" ON public.daily_levels;
REVOKE SELECT ON public.daily_levels FROM anon, authenticated;
GRANT ALL ON public.daily_levels TO service_role;
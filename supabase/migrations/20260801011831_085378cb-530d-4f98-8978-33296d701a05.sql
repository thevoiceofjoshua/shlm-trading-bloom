DROP POLICY IF EXISTS "Anyone can submit a valid application" ON public.applications;

REVOKE INSERT ON public.applications FROM anon;
REVOKE ALL ON public.applications FROM anon;
GRANT SELECT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
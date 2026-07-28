
-- 1. Switch has_role to SECURITY INVOKER (still safe: only used with auth.uid(), and users can read their own roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. Explicit deny policies for purchases writes (service role bypasses RLS)
CREATE POLICY "No client inserts on purchases"
  ON public.purchases FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client updates on purchases"
  ON public.purchases FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No client deletes on purchases"
  ON public.purchases FOR DELETE
  TO anon, authenticated
  USING (false);

-- 3. Explicit deny policies for user_roles writes (service role bypasses RLS)
CREATE POLICY "No client inserts on user_roles"
  ON public.user_roles FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
  ON public.user_roles FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No client deletes on user_roles"
  ON public.user_roles FOR DELETE
  TO anon, authenticated
  USING (false);

CREATE TABLE public.member_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  consequence text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_rules TO authenticated;
GRANT ALL ON public.member_rules TO service_role;

ALTER TABLE public.member_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own rules"
ON public.member_rules
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_member_rules_updated_at
BEFORE UPDATE ON public.member_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
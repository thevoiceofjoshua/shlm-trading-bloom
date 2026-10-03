CREATE TABLE public.member_readiness (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ready_date date NOT NULL,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ready_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_readiness TO authenticated;
GRANT ALL ON public.member_readiness TO service_role;
ALTER TABLE public.member_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage their own readiness checklist" ON public.member_readiness
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_member_readiness_updated_at BEFORE UPDATE ON public.member_readiness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
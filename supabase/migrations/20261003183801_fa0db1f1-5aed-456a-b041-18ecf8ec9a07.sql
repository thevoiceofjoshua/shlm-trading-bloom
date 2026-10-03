ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruiter';

CREATE TABLE public.recruiter_lands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  delta integer NOT NULL,
  month date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recruiter_lands_recruiter_month_idx ON public.recruiter_lands(recruiter_id, month);
GRANT SELECT ON public.recruiter_lands TO authenticated;
GRANT ALL ON public.recruiter_lands TO service_role;
ALTER TABLE public.recruiter_lands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters see own lands, founder sees all" ON public.recruiter_lands
  FOR SELECT TO authenticated
  USING (recruiter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
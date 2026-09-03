CREATE TABLE public.daily_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument TEXT NOT NULL,
  session_date DATE NOT NULL,
  levels JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (instrument, session_date)
);

GRANT SELECT ON public.daily_levels TO authenticated;
GRANT ALL ON public.daily_levels TO service_role;

ALTER TABLE public.daily_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can read daily levels"
ON public.daily_levels FOR SELECT TO authenticated USING (true);
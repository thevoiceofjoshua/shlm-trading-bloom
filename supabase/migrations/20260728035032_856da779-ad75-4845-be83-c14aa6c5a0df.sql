
CREATE TABLE public.site_stats (
  id INT PRIMARY KEY DEFAULT 1,
  performance_value TEXT NOT NULL DEFAULT 'Tracking',
  performance_note TEXT NOT NULL DEFAULT 'Verified member results tracked live from July 2026 — real numbers, published as they happen.',
  cohort_value TEXT NOT NULL DEFAULT 'New',
  cohort_label TEXT NOT NULL DEFAULT 'Cohort now enrolling',
  results_value TEXT NOT NULL DEFAULT 'Live',
  results_label TEXT NOT NULL DEFAULT 'Results tracked from day one',
  hero_note TEXT NOT NULL DEFAULT 'New cohort now enrolling — results tracked live from day one',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_stats_singleton CHECK (id = 1)
);

GRANT SELECT ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site stats"
  ON public.site_stats FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.site_stats (id) VALUES (1);

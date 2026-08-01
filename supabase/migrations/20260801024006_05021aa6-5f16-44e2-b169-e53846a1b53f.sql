CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  role text NOT NULL DEFAULT '',
  quote text NOT NULL,
  rating smallint NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  verified boolean NOT NULL DEFAULT true,
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read verified published reviews"
ON public.reviews FOR SELECT TO anon, authenticated
USING (verified = true AND published = true);

INSERT INTO public.reviews (author, role, quote, rating, sort_order, created_at) VALUES
('Marcus T.', 'Futures trader, 18 months', 'SHLM replaced the noise with a process. My win rate improved, but more importantly my drawdowns became controlled.', 5, 10, now() - interval '21 days'),
('Daniela R.', 'Forex trader, 8 months', 'The 1:1 mentorship is the difference maker. Having someone review my actual trades every week accelerated everything.', 5, 20, now() - interval '16 days'),
('James L.', 'Crypto trader, 12 months', 'I had taken courses before. This was the first time I left with a system I actually trust and follow.', 5, 30, now() - interval '12 days'),
('Andre B.', 'Micro Gold, 6 months', 'The breakout strategy finally gave my entries structure. I stopped chasing and started waiting for the level.', 5, 40, now() - interval '8 days'),
('Priya N.', 'Index futures, 4 months', 'Risk framework alone was worth the price. Two weeks in I cut my largest loss in half and never looked back.', 5, 50, now() - interval '4 days'),
('Tyler W.', 'Nasdaq scalper, 9 months', 'Community keeps me accountable. Posting my plan before the open changed how disciplined I am at execution.', 5, 60, now() - interval '2 days');
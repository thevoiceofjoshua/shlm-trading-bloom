CREATE TABLE IF NOT EXISTS public.member_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  note_date date not null,
  session text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, note_date, session)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_notes TO authenticated;
GRANT ALL ON public.member_notes TO service_role;

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own notes"
  ON public.member_notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.session_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  review_date date not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, review_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_reviews TO authenticated;
GRANT ALL ON public.session_reviews TO service_role;

ALTER TABLE public.session_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own reviews"
  ON public.session_reviews
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
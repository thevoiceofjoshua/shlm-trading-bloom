SET check_function_bodies = false;

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'shlm_mod');

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tier text NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    experience text,
    goals text,
    scheduled_at timestamp with time zone NOT NULL,
    timezone text,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_link_sent_at timestamp with time zone,
    payment_link_session_id text,
    payment_link_status text DEFAULT 'not_sent'::text NOT NULL
);

CREATE TABLE public.daily_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instrument text NOT NULL,
    session_date date NOT NULL,
    levels jsonb NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.member_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    note_date date NOT NULL,
    session text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.member_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    consequence text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    tier text NOT NULL,
    stripe_session_id text NOT NULL,
    stripe_payment_intent text,
    amount_total integer,
    currency text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchases_tier_check CHECK ((tier = ANY (ARRAY['foundation'::text, 'mentorship'::text, 'elite'::text])))
);

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author text NOT NULL,
    role text DEFAULT ''::text NOT NULL,
    quote text NOT NULL,
    rating smallint DEFAULT 5 NOT NULL,
    verified boolean DEFAULT true NOT NULL,
    published boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE public.session_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    review_date date NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.site_stats (
    id integer DEFAULT 1 NOT NULL,
    performance_value text DEFAULT 'Tracking'::text NOT NULL,
    performance_note text DEFAULT 'Verified member results tracked live from July 2026 — real numbers, published as they happen.'::text NOT NULL,
    cohort_value text DEFAULT 'New'::text NOT NULL,
    cohort_label text DEFAULT 'Cohort now enrolling'::text NOT NULL,
    results_value text DEFAULT 'Live'::text NOT NULL,
    results_label text DEFAULT 'Results tracked from day one'::text NOT NULL,
    hero_note text DEFAULT 'New cohort now enrolling — results tracked live from day one'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_stats_singleton CHECK ((id = 1))
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.applications ADD CONSTRAINT applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_levels ADD CONSTRAINT daily_levels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_levels ADD CONSTRAINT daily_levels_instrument_session_date_key UNIQUE (instrument, session_date);
ALTER TABLE ONLY public.member_notes ADD CONSTRAINT member_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.member_notes ADD CONSTRAINT member_notes_user_id_note_date_session_key UNIQUE (user_id, note_date, session);
ALTER TABLE ONLY public.member_rules ADD CONSTRAINT member_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.member_rules ADD CONSTRAINT member_rules_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_stripe_session_id_key UNIQUE (stripe_session_id);
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.session_reviews ADD CONSTRAINT session_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.session_reviews ADD CONSTRAINT session_reviews_user_id_review_date_key UNIQUE (user_id, review_date);
ALTER TABLE ONLY public.site_stats ADD CONSTRAINT site_stats_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

CREATE INDEX applications_payment_link_status_idx ON public.applications USING btree (payment_link_status);
CREATE INDEX purchases_email_idx ON public.purchases USING btree (email);
CREATE INDEX purchases_user_id_idx ON public.purchases USING btree (user_id);

CREATE TRIGGER update_member_rules_updated_at BEFORE UPDATE ON public.member_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE ONLY public.member_notes ADD CONSTRAINT member_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.session_reviews ADD CONSTRAINT session_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

GRANT ALL ON TABLE public.applications TO authenticated;
GRANT ALL ON TABLE public.applications TO service_role;
GRANT ALL ON TABLE public.daily_levels TO anon;
GRANT ALL ON TABLE public.daily_levels TO authenticated;
GRANT ALL ON TABLE public.daily_levels TO service_role;
GRANT ALL ON TABLE public.member_notes TO anon;
GRANT ALL ON TABLE public.member_notes TO authenticated;
GRANT ALL ON TABLE public.member_notes TO service_role;
GRANT ALL ON TABLE public.member_rules TO anon;
GRANT ALL ON TABLE public.member_rules TO authenticated;
GRANT ALL ON TABLE public.member_rules TO service_role;
GRANT ALL ON TABLE public.purchases TO anon;
GRANT ALL ON TABLE public.purchases TO authenticated;
GRANT ALL ON TABLE public.purchases TO service_role;
GRANT ALL ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;
GRANT ALL ON TABLE public.session_reviews TO anon;
GRANT ALL ON TABLE public.session_reviews TO authenticated;
GRANT ALL ON TABLE public.session_reviews TO service_role;
GRANT ALL ON TABLE public.site_stats TO anon;
GRANT ALL ON TABLE public.site_stats TO authenticated;
GRANT ALL ON TABLE public.site_stats TO service_role;
GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can update applications" ON public.applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Members can manage own notes" ON public.member_notes TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Members can manage own reviews" ON public.session_reviews TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Members can manage own rules" ON public.member_rules TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "No client deletes on purchases" ON public.purchases FOR DELETE TO authenticated, anon USING (false);
CREATE POLICY "No client deletes on user_roles" ON public.user_roles FOR DELETE TO authenticated, anon USING (false);
CREATE POLICY "No client inserts on purchases" ON public.purchases FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client inserts on user_roles" ON public.user_roles FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates on purchases" ON public.purchases FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "No client updates on user_roles" ON public.user_roles FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Public can read site stats" ON public.site_stats FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public can read verified published reviews" ON public.reviews FOR SELECT TO authenticated, anon USING (((verified = true) AND (published = true)));
CREATE POLICY "Signed-in members can read daily levels" ON public.daily_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their own purchases" ON public.purchases FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (email = (auth.jwt() ->> 'email'::text))));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
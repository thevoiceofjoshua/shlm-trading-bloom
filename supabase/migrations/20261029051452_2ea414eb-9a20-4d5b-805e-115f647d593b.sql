CREATE OR REPLACE FUNCTION public.can_manage_indicators() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() = '27be6c2d-ce77-425b-bc69-53026daf099b'::uuid AND public.has_role(auth.uid(), 'admin'::public.app_role) $$;
REVOKE ALL ON FUNCTION public.can_manage_indicators() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_indicators() TO authenticated, service_role;

CREATE TABLE public.indicators (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 1 AND 100), description text NOT NULL DEFAULT '' CHECK(char_length(description)<=500), active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.indicators TO authenticated;
GRANT ALL ON public.indicators TO service_role;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre members read active indicators, owner manages catalogue" ON public.indicators FOR SELECT TO authenticated USING(public.can_manage_indicators() OR (active AND public.can_read_seasonality()));
CREATE UNIQUE INDEX indicators_unique_name ON public.indicators(lower(btrim(name)));
CREATE TRIGGER indicators_updated BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.indicators(id,name,created_by,display_order) VALUES('638bd56e-a13c-45c2-9bce-9abbcf0e42e2','SHLM SYSTEM','27be6c2d-ce77-425b-bc69-53026daf099b',0);

CREATE TABLE public.indicator_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, indicator_id uuid NOT NULL REFERENCES public.indicators(id), indicator_name text NOT NULL, member_name text NOT NULL DEFAULT '', member_email text NOT NULL DEFAULT '', tradingview_username text NOT NULL CHECK(char_length(tradingview_username) BETWEEN 2 AND 60 AND tradingview_username ~ '^[A-Za-z0-9_]+$'), note text NOT NULL DEFAULT '' CHECK(char_length(note)<=500), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), submission_id uuid NOT NULL, notification_status text NOT NULL DEFAULT 'pending' CHECK(notification_status IN ('pending','sent','failed')), reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,submission_id)
);
GRANT SELECT ON public.indicator_requests TO authenticated;
GRANT ALL ON public.indicator_requests TO service_role;
ALTER TABLE public.indicator_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own indicator requests, owner reads all" ON public.indicator_requests FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.can_manage_indicators());
CREATE UNIQUE INDEX indicator_one_pending ON public.indicator_requests(user_id,indicator_id) WHERE status='pending';
CREATE INDEX indicator_requests_recent ON public.indicator_requests(created_at DESC);
CREATE TRIGGER indicator_requests_updated BEFORE UPDATE ON public.indicator_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.indicator_request_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES public.indicator_requests(id), user_id uuid NOT NULL, previous_status text, status text NOT NULL CHECK(status IN ('pending','approved','rejected')), actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.indicator_request_events TO authenticated;
GRANT ALL ON public.indicator_request_events TO service_role;
ALTER TABLE public.indicator_request_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own request history, owner reads all" ON public.indicator_request_events FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.can_manage_indicators());

CREATE OR REPLACE FUNCTION public.record_indicator_request_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO public.indicator_request_events(request_id,user_id,status,actor_id) VALUES(NEW.id,NEW.user_id,NEW.status,NEW.user_id);
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.indicator_request_events(request_id,user_id,previous_status,status,actor_id) VALUES(NEW.id,NEW.user_id,OLD.status,NEW.status,COALESCE(auth.uid(),NEW.reviewed_by)); END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.record_indicator_request_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER indicator_request_history AFTER INSERT OR UPDATE OF status ON public.indicator_requests FOR EACH ROW EXECUTE FUNCTION public.record_indicator_request_event();

CREATE OR REPLACE FUNCTION public.submit_indicator_request(p_indicator uuid,p_username text,p_note text,p_submission uuid) RETURNS public.indicator_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_indicator public.indicators; v_request public.indicator_requests; v_username text := btrim(p_username); BEGIN
 IF v_user IS NULL OR NOT public.can_read_seasonality() THEN RAISE EXCEPTION 'Centre membership required' USING ERRCODE='42501'; END IF;
 IF v_username IS NULL OR char_length(v_username) NOT BETWEEN 2 AND 60 OR v_username !~ '^[A-Za-z0-9_]+$' OR char_length(COALESCE(p_note,''))>500 OR p_submission IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || p_indicator::text,0));
 SELECT * INTO v_request FROM public.indicator_requests WHERE user_id=v_user AND submission_id=p_submission;
 IF FOUND THEN IF v_request.indicator_id<>p_indicator OR v_request.tradingview_username<>v_username OR v_request.note<>COALESCE(p_note,'') THEN RAISE EXCEPTION 'Submission already used'; END IF; RETURN v_request; END IF;
 SELECT * INTO v_indicator FROM public.indicators WHERE id=p_indicator AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Indicator is not active'; END IF;
 SELECT * INTO v_request FROM public.indicator_requests WHERE user_id=v_user AND indicator_id=p_indicator AND status='pending';
 IF FOUND THEN RETURN v_request; END IF;
 INSERT INTO public.indicator_requests(user_id,indicator_id,indicator_name,member_name,member_email,tradingview_username,note,submission_id) VALUES(v_user,p_indicator,v_indicator.name,COALESCE(auth.jwt()->'user_metadata'->>'full_name',auth.jwt()->'user_metadata'->>'name',''),COALESCE(auth.jwt()->>'email',''),v_username,COALESCE(p_note,''),p_submission) RETURNING * INTO v_request;
 RETURN v_request; END $$;
REVOKE ALL ON FUNCTION public.submit_indicator_request(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_indicator_request(uuid,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.manage_indicator(p_id uuid,p_name text,p_description text,p_active boolean) RETURNS public.indicators LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.indicators; BEGIN
 IF NOT public.can_manage_indicators() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 100 OR char_length(COALESCE(p_description,''))>500 OR p_active IS NULL THEN RAISE EXCEPTION 'Invalid indicator'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('indicator-catalogue',0));
 IF p_id IS NULL THEN INSERT INTO public.indicators(name,description,active,display_order,created_by) VALUES(btrim(p_name),COALESCE(p_description,''),p_active,COALESCE((SELECT max(display_order)+1 FROM public.indicators),0),auth.uid()) RETURNING * INTO v_row;
 ELSE UPDATE public.indicators SET name=btrim(p_name),description=COALESCE(p_description,''),active=p_active WHERE id=p_id RETURNING * INTO v_row; IF NOT FOUND THEN RAISE EXCEPTION 'Indicator not found'; END IF; END IF;
 RETURN v_row; END $$;
REVOKE ALL ON FUNCTION public.manage_indicator(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_indicator(uuid,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_indicators(p_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.can_manage_indicators() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('indicator-catalogue',0));
 IF p_ids IS NULL OR cardinality(p_ids)<>(SELECT count(*) FROM public.indicators) OR cardinality(p_ids)<>(SELECT count(DISTINCT x) FROM unnest(p_ids) x) OR EXISTS(SELECT 1 FROM unnest(p_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.indicators WHERE id=x)) THEN RAISE EXCEPTION 'Catalogue changed; reload and try again'; END IF;
 UPDATE public.indicators i SET display_order=u.ord::integer-1 FROM unnest(p_ids) WITH ORDINALITY AS u(id,ord) WHERE i.id=u.id;
 END $$;
REVOKE ALL ON FUNCTION public.reorder_indicators(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reorder_indicators(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_indicator_request(p_id uuid,p_status text) RETURNS public.indicator_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_row public.indicator_requests; BEGIN
 IF NOT public.can_manage_indicators() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO v_row FROM public.indicator_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF v_row.status=p_status THEN RETURN v_row; END IF;
 IF v_row.status<>'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
 UPDATE public.indicator_requests SET status=p_status,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p_id RETURNING * INTO v_row; RETURN v_row; END $$;
REVOKE ALL ON FUNCTION public.review_indicator_request(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_indicator_request(uuid,text) TO authenticated;
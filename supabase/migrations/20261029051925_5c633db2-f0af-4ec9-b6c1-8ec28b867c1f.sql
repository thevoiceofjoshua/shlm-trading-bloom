CREATE OR REPLACE FUNCTION public.submit_indicator_request(p_user uuid,p_indicator uuid,p_username text,p_note text,p_submission uuid) RETURNS public.indicator_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_indicator public.indicators; v_request public.indicator_requests; v_username text := btrim(p_username); v_email text; v_name text; BEGIN
 SELECT email,COALESCE(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','') INTO v_email,v_name FROM auth.users WHERE id=p_user AND (banned_until IS NULL OR banned_until<now());
 IF NOT FOUND OR NOT (public.has_role(p_user,'admin') OR public.has_role(p_user,'shlm_mod') OR public.has_role(p_user,'free_member') OR public.has_role(p_user,'recruiter') OR EXISTS(SELECT 1 FROM public.purchases WHERE status='paid' AND (user_id=p_user OR email=v_email))) THEN RAISE EXCEPTION 'Centre membership required' USING ERRCODE='42501'; END IF;
 IF v_username IS NULL OR char_length(v_username) NOT BETWEEN 2 AND 60 OR v_username !~ '^[A-Za-z0-9_]+$' OR char_length(COALESCE(p_note,''))>500 OR p_submission IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text || p_indicator::text,0));
 SELECT * INTO v_request FROM public.indicator_requests WHERE user_id=p_user AND submission_id=p_submission;
 IF FOUND THEN IF v_request.indicator_id<>p_indicator OR v_request.tradingview_username<>v_username OR v_request.note<>COALESCE(p_note,'') THEN RAISE EXCEPTION 'Submission already used'; END IF; RETURN v_request; END IF;
 SELECT * INTO v_indicator FROM public.indicators WHERE id=p_indicator AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Indicator is not active'; END IF;
 SELECT * INTO v_request FROM public.indicator_requests WHERE user_id=p_user AND indicator_id=p_indicator AND status='pending';
 IF FOUND THEN IF v_request.tradingview_username<>v_username OR v_request.note<>COALESCE(p_note,'') THEN RAISE EXCEPTION 'Different request already pending'; END IF; RETURN v_request; END IF;
 INSERT INTO public.indicator_requests(user_id,indicator_id,indicator_name,member_name,member_email,tradingview_username,note,submission_id) VALUES(p_user,p_indicator,v_indicator.name,COALESCE(v_name,''),COALESCE(v_email,''),v_username,COALESCE(p_note,''),p_submission) RETURNING * INTO v_request; RETURN v_request; END $$;
REVOKE ALL ON FUNCTION public.submit_indicator_request(uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_indicator_request(uuid,uuid,text,text,uuid) TO service_role;

DROP FUNCTION public.manage_indicator(uuid,uuid,text,text,boolean);
CREATE FUNCTION public.manage_indicator(p_actor uuid,p_id uuid,p_name text,p_description text,p_active boolean,p_expected timestamptz) RETURNS public.indicators LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_row public.indicators; BEGIN
 IF p_actor IS DISTINCT FROM '27be6c2d-ce77-425b-bc69-53026daf099b'::uuid OR NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 100 OR char_length(COALESCE(p_description,''))>500 OR p_active IS NULL THEN RAISE EXCEPTION 'Invalid indicator'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('indicator-catalogue',0));
 IF p_id IS NULL THEN INSERT INTO public.indicators(name,description,active,display_order,created_by) VALUES(btrim(p_name),COALESCE(p_description,''),p_active,COALESCE((SELECT max(display_order)+1 FROM public.indicators),0),p_actor) RETURNING * INTO v_row;
 ELSE UPDATE public.indicators SET name=btrim(p_name),description=COALESCE(p_description,''),active=p_active WHERE id=p_id AND updated_at=p_expected RETURNING * INTO v_row; IF NOT FOUND THEN RAISE EXCEPTION 'Indicator changed; reload'; END IF; END IF; RETURN v_row; END $$;
REVOKE ALL ON FUNCTION public.manage_indicator(uuid,uuid,text,text,boolean,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_indicator(uuid,uuid,text,text,boolean,timestamptz) TO service_role;
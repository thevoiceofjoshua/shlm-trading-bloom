ALTER FUNCTION public.can_manage_indicators() SECURITY INVOKER;
DROP FUNCTION public.submit_indicator_request(uuid,text,text,uuid);
DROP FUNCTION public.manage_indicator(uuid,text,text,boolean);
DROP FUNCTION public.reorder_indicators(uuid[]);
DROP FUNCTION public.review_indicator_request(uuid,text);

CREATE FUNCTION public.submit_indicator_request(p_user uuid,p_indicator uuid,p_username text,p_note text,p_submission uuid) RETURNS public.indicator_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 IF FOUND THEN RETURN v_request; END IF;
 INSERT INTO public.indicator_requests(user_id,indicator_id,indicator_name,member_name,member_email,tradingview_username,note,submission_id) VALUES(p_user,p_indicator,v_indicator.name,COALESCE(v_name,''),COALESCE(v_email,''),v_username,COALESCE(p_note,''),p_submission) RETURNING * INTO v_request;
 RETURN v_request; END $$;
REVOKE ALL ON FUNCTION public.submit_indicator_request(uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_indicator_request(uuid,uuid,text,text,uuid) TO service_role;

CREATE FUNCTION public.manage_indicator(p_actor uuid,p_id uuid,p_name text,p_description text,p_active boolean) RETURNS public.indicators LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_row public.indicators; BEGIN
 IF p_actor IS DISTINCT FROM '27be6c2d-ce77-425b-bc69-53026daf099b'::uuid OR NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 100 OR char_length(COALESCE(p_description,''))>500 OR p_active IS NULL THEN RAISE EXCEPTION 'Invalid indicator'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('indicator-catalogue',0));
 IF p_id IS NULL THEN INSERT INTO public.indicators(name,description,active,display_order,created_by) VALUES(btrim(p_name),COALESCE(p_description,''),p_active,COALESCE((SELECT max(display_order)+1 FROM public.indicators),0),p_actor) RETURNING * INTO v_row;
 ELSE UPDATE public.indicators SET name=btrim(p_name),description=COALESCE(p_description,''),active=p_active WHERE id=p_id RETURNING * INTO v_row; IF NOT FOUND THEN RAISE EXCEPTION 'Indicator not found'; END IF; END IF; RETURN v_row; END $$;
REVOKE ALL ON FUNCTION public.manage_indicator(uuid,uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_indicator(uuid,uuid,text,text,boolean) TO service_role;

CREATE FUNCTION public.reorder_indicators(p_actor uuid,p_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF p_actor IS DISTINCT FROM '27be6c2d-ce77-425b-bc69-53026daf099b'::uuid OR NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('indicator-catalogue',0));
 IF p_ids IS NULL OR cardinality(p_ids)<>(SELECT count(*) FROM public.indicators) OR cardinality(p_ids)<>(SELECT count(DISTINCT x) FROM unnest(p_ids) x) OR EXISTS(SELECT 1 FROM unnest(p_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.indicators WHERE id=x)) THEN RAISE EXCEPTION 'Catalogue changed; reload and try again'; END IF;
 UPDATE public.indicators i SET display_order=u.ord::integer-1 FROM unnest(p_ids) WITH ORDINALITY u(id,ord) WHERE i.id=u.id; END $$;
REVOKE ALL ON FUNCTION public.reorder_indicators(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_indicators(uuid,uuid[]) TO service_role;

CREATE FUNCTION public.review_indicator_request(p_actor uuid,p_id uuid,p_status text) RETURNS public.indicator_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_row public.indicator_requests; BEGIN
 IF p_actor IS DISTINCT FROM '27be6c2d-ce77-425b-bc69-53026daf099b'::uuid OR NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO v_row FROM public.indicator_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF v_row.status=p_status THEN RETURN v_row; END IF;
 IF v_row.status<>'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
 UPDATE public.indicator_requests SET status=p_status,reviewed_by=p_actor,reviewed_at=now() WHERE id=p_id RETURNING * INTO v_row; RETURN v_row; END $$;
REVOKE ALL ON FUNCTION public.review_indicator_request(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_indicator_request(uuid,uuid,text) TO service_role;
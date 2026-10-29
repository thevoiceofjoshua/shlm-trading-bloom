CREATE POLICY bible_images_admin_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='bible-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY bible_images_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='bible-images' AND public.has_role(auth.uid(),'admin') AND (storage.foldername(name))[1]='teachings');
CREATE POLICY bible_images_admin_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='bible-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY bible_images_member_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='bible-images' AND public.is_bible_member() AND EXISTS(SELECT 1 FROM public.bible_teachings t WHERE t.thumbnail_path=name AND t.published AND t.state='ready'));
CREATE FUNCTION public.save_journal_entry(p_date date,p_old_key text,p_new_key text,p_body text,p_expected timestamptz) RETURNS text LANGUAGE plpgsql SET search_path=public AS $$ DECLARE v_user uuid:=auth.uid(); v_updated timestamptz; v_existing text; BEGIN
 IF v_user IS NULL OR char_length(p_body)>1000000 OR char_length(p_new_key)>120 OR p_new_key='' THEN RAISE EXCEPTION 'Invalid journal entry'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text||':journal:'||p_date::text,0));
 IF p_old_key<>'' THEN SELECT updated_at,body INTO v_updated,v_existing FROM public.member_notes WHERE user_id=v_user AND note_date=p_date AND session=p_old_key FOR UPDATE; IF FOUND AND (p_expected IS NULL OR v_updated IS DISTINCT FROM p_expected) THEN RAISE EXCEPTION 'Entry changed; reload before saving'; END IF; END IF;
 IF p_old_key IS DISTINCT FROM p_new_key AND EXISTS(SELECT 1 FROM public.member_notes WHERE user_id=v_user AND note_date=p_date AND session=p_new_key) THEN RAISE EXCEPTION 'Session entry already exists'; END IF;
 INSERT INTO public.member_notes(user_id,note_date,session,body) VALUES(v_user,p_date,p_new_key,p_body) ON CONFLICT(user_id,note_date,session) DO UPDATE SET body=EXCLUDED.body,updated_at=now();
 IF p_old_key<>'' AND p_old_key<>p_new_key THEN DELETE FROM public.member_notes WHERE user_id=v_user AND note_date=p_date AND session=p_old_key; END IF;
 RETURN p_new_key; END $$;
REVOKE ALL ON FUNCTION public.save_journal_entry(date,text,text,text,timestamptz) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_journal_entry(date,text,text,text,timestamptz) TO authenticated;

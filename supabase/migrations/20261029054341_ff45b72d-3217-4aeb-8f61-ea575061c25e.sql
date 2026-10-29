ALTER TABLE public.bible_teachings ADD COLUMN upload_reservation uuid,ADD COLUMN upload_claimed_at timestamptz;
CREATE FUNCTION public.claim_bible_upload(p_actor uuid,p_id uuid,p_token uuid,p_provider_count integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_row public.bible_teachings; v_pending integer; BEGIN
 IF NOT public.has_role(p_actor,'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('bible-upload-reservations',0));
 SELECT * INTO v_row FROM public.bible_teachings WHERE id=p_id FOR UPDATE;IF NOT FOUND OR v_row.mux_asset_id IS NOT NULL OR v_row.mux_upload_id IS NOT NULL THEN RAISE EXCEPTION 'Teaching already has an upload'; END IF;
 IF v_row.upload_reservation IS NOT NULL THEN RAISE EXCEPTION 'An upload is already starting; wait and refresh'; END IF;
 SELECT count(*) INTO v_pending FROM public.bible_teachings WHERE mux_asset_id IS NULL AND (mux_upload_id IS NOT NULL OR upload_reservation IS NOT NULL);
 IF p_provider_count+v_pending>=10 THEN RAISE EXCEPTION 'Free video library full'; END IF;
 UPDATE public.bible_teachings SET upload_reservation=p_token,upload_claimed_at=now() WHERE id=p_id;RETURN true;END $$;
REVOKE ALL ON FUNCTION public.claim_bible_upload(uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.claim_bible_upload(uuid,uuid,uuid,integer) TO service_role;
CREATE FUNCTION public.save_journal_entry_confirmed(p_date date,p_old_key text,p_new_key text,p_body text,p_expected timestamptz) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$ DECLARE v_key text;v_updated timestamptz;BEGIN
 v_key:=public.save_journal_entry(p_date,p_old_key,p_new_key,p_body,p_expected);
 SELECT updated_at INTO v_updated FROM public.member_notes WHERE user_id=auth.uid() AND note_date=p_date AND session=v_key;
 RETURN jsonb_build_object('key',v_key,'updatedAt',v_updated);END $$;
REVOKE ALL ON FUNCTION public.save_journal_entry_confirmed(date,text,text,text,timestamptz) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.save_journal_entry_confirmed(date,text,text,text,timestamptz) TO authenticated;
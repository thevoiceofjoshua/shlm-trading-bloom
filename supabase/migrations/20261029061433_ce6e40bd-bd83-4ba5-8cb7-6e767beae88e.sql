ALTER TABLE public.guard_sessions ADD COLUMN done_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_guard_journal(p_session uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_session public.guard_sessions; v_body jsonb; v_trades jsonb;
BEGIN
 SELECT * INTO v_session FROM public.guard_sessions WHERE id=p_session;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id::text,'instrument',instrument,'direction',direction,'result',outcome,'pnl',pnl::text,'note',note,'account',account,'occurredAt',occurred_at) ORDER BY created_at),'[]'::jsonb) INTO v_trades FROM public.guard_trades WHERE session_id=p_session AND undone_at IS NULL;
 SELECT body::jsonb INTO v_body FROM public.member_notes WHERE user_id=v_session.user_id AND note_date=v_session.note_date AND session=v_session.period||'#guard';
 v_body:=COALESCE(v_body,'{}'::jsonb)||jsonb_build_object('session',v_session.period,'trades',v_trades);
 PERFORM set_config('shlm.guard_write','yes',true);
 INSERT INTO public.member_notes(user_id,note_date,session,body) VALUES(v_session.user_id,v_session.note_date,v_session.period||'#guard',v_body::text) ON CONFLICT(user_id,note_date,session) DO UPDATE SET body=EXCLUDED.body,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.sync_guard_journal(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_guard_journal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.commit_guard_trade(p_user uuid,p_id uuid,p_instrument text,p_account text,p_outcome text,p_pnl numeric,p_note text,p_direction text,p_session text)
RETURNS public.guard_trades LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_period record; v_session public.guard_sessions; v_trade public.guard_trades; v_count integer; v_win boolean;
BEGIN
 SELECT * INTO v_period FROM public.guard_period(now());
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':guard',0));
 SELECT * INTO v_trade FROM public.guard_trades WHERE id=p_id AND user_id=p_user;
 IF FOUND THEN IF v_trade.instrument IS DISTINCT FROM p_instrument OR v_trade.account IS DISTINCT FROM p_account OR v_trade.outcome IS DISTINCT FROM p_outcome OR v_trade.pnl IS DISTINCT FROM p_pnl OR v_trade.note IS DISTINCT FROM p_note OR v_trade.direction IS DISTINCT FROM p_direction THEN RAISE EXCEPTION 'Submission already used'; END IF; RETURN v_trade; END IF;
 IF p_session IS DISTINCT FROM v_period.session_key THEN RAISE EXCEPTION 'Session changed; reload before logging'; END IF;
 IF NOT v_period.window_open THEN RAISE EXCEPTION 'Outside trading window'; END IF;
 IF p_id IS NULL OR p_outcome NOT IN ('win','loss','breakeven') OR p_pnl IS NULL OR p_pnl::text IN ('NaN','Infinity','-Infinity') OR abs(p_pnl)>999999999999 OR (p_outcome='win' AND p_pnl<=0) OR (p_outcome='loss' AND p_pnl>=0) OR (p_outcome='breakeven' AND p_pnl>0) OR p_instrument NOT IN ('NQ','MNQ','YM','MYM','GC','MGC') OR char_length(p_account)>100 OR char_length(p_note)>2000 OR p_direction NOT IN ('','long','short') THEN RAISE EXCEPTION 'Invalid trade'; END IF;
 INSERT INTO public.guard_sessions(user_id,session_key,note_date,period) VALUES(p_user,v_period.session_key,v_period.note_date,v_period.period) ON CONFLICT(user_id,session_key) DO NOTHING;
 SELECT * INTO v_session FROM public.guard_sessions WHERE user_id=p_user AND session_key=v_period.session_key FOR UPDATE;
 IF v_session.locked_at IS NOT NULL THEN RAISE EXCEPTION 'Session locked'; END IF;
 INSERT INTO public.guard_trades(id,session_id,user_id,instrument,account,outcome,pnl,note,direction) VALUES(p_id,v_session.id,p_user,p_instrument,p_account,p_outcome,p_pnl,p_note,p_direction) RETURNING * INTO v_trade;
 SELECT count(*) FILTER(WHERE outcome<>'breakeven'),COALESCE(bool_or(outcome='win'),false) INTO v_count,v_win FROM public.guard_trades WHERE session_id=v_session.id AND undone_at IS NULL;
 UPDATE public.guard_sessions SET locked_at=CASE WHEN v_win OR v_count>=3 THEN now() END,lock_reason=CASE WHEN v_win THEN 'one-win' WHEN v_count>=3 THEN 'three-trade-limit' END,updated_at=now() WHERE id=v_session.id;
 PERFORM public.sync_guard_journal(v_session.id);
 RETURN v_trade;
END $$;
REVOKE ALL ON FUNCTION public.commit_guard_trade(uuid,uuid,text,text,text,numeric,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_guard_trade(uuid,uuid,text,text,text,numeric,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.undo_guard_trade(p_user uuid,p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_trade public.guard_trades;v_session public.guard_sessions;v_last uuid;v_count integer;v_win boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':guard',0));
 SELECT * INTO v_trade FROM public.guard_trades WHERE id=p_id AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trade not found'; END IF;
 IF v_trade.undone_at IS NOT NULL THEN RETURN; END IF;
 SELECT * INTO v_session FROM public.guard_sessions WHERE id=v_trade.session_id FOR UPDATE;
 SELECT id INTO v_last FROM public.guard_trades WHERE session_id=v_session.id ORDER BY created_at DESC LIMIT 1;
 IF v_last<>p_id OR now()-v_trade.created_at>=interval '15 seconds' THEN RAISE EXCEPTION 'Undo window ended'; END IF;
 UPDATE public.guard_trades SET undone_at=now() WHERE id=p_id;
 SELECT count(*) FILTER(WHERE outcome<>'breakeven'),COALESCE(bool_or(outcome='win'),false) INTO v_count,v_win FROM public.guard_trades WHERE session_id=v_session.id AND undone_at IS NULL;
 UPDATE public.guard_sessions SET locked_at=CASE WHEN v_win OR v_count>=3 OR done_at IS NOT NULL THEN locked_at END,lock_reason=CASE WHEN v_win THEN 'one-win' WHEN v_count>=3 THEN 'three-trade-limit' WHEN done_at IS NOT NULL THEN 'done' END,updated_at=now() WHERE id=v_session.id;
 PERFORM public.sync_guard_journal(v_session.id);
END $$;
REVOKE ALL ON FUNCTION public.undo_guard_trade(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.undo_guard_trade(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_guard_done(p_user uuid,p_session text,p_revert boolean,p_expected timestamptz)
RETURNS public.guard_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_period record;v_session public.guard_sessions;v_count integer;v_win boolean;
BEGIN
 IF p_user IS NULL OR p_revert IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
 SELECT * INTO v_period FROM public.guard_period(now());
 IF p_session IS DISTINCT FROM v_period.session_key THEN RAISE EXCEPTION 'Session changed; reload before logging'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':guard',0));
 INSERT INTO public.guard_sessions(user_id,session_key,note_date,period) VALUES(p_user,v_period.session_key,v_period.note_date,v_period.period) ON CONFLICT(user_id,session_key) DO NOTHING;
 SELECT * INTO v_session FROM public.guard_sessions WHERE user_id=p_user AND session_key=p_session FOR UPDATE;
 SELECT count(*) FILTER(WHERE outcome<>'breakeven'),COALESCE(bool_or(outcome='win'),false) INTO v_count,v_win FROM public.guard_trades WHERE session_id=v_session.id AND undone_at IS NULL;
 IF p_revert THEN
  IF v_session.done_at IS NULL THEN RETURN v_session; END IF;
  IF v_session.done_at IS DISTINCT FROM p_expected OR now()>=v_session.done_at+interval '5 minutes' THEN RAISE EXCEPTION 'Done revert window ended'; END IF;
  UPDATE public.guard_sessions SET done_at=NULL,locked_at=CASE WHEN v_win OR v_count>=3 THEN locked_at END,lock_reason=CASE WHEN v_win THEN 'one-win' WHEN v_count>=3 THEN 'three-trade-limit' END WHERE id=v_session.id RETURNING * INTO v_session;
 ELSE
  IF v_session.locked_at IS NOT NULL THEN RETURN v_session; END IF;
  UPDATE public.guard_sessions SET done_at=now(),locked_at=now(),lock_reason='done' WHERE id=v_session.id RETURNING * INTO v_session;
 END IF;
 PERFORM public.sync_guard_journal(v_session.id);
 RETURN v_session;
END $$;
REVOKE ALL ON FUNCTION public.set_guard_done(uuid,text,boolean,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_guard_done(uuid,text,boolean,timestamptz) TO service_role;

CREATE TABLE public.journal_voice_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'started' CHECK(status IN('started','completed','failed','denied')),
 denial_message text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.journal_voice_requests TO service_role;
ALTER TABLE public.journal_voice_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER journal_voice_requests_updated BEFORE UPDATE ON public.journal_voice_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX journal_voice_requests_user_time ON public.journal_voice_requests(user_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.claim_journal_voice(p_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;v_message text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':journal-voice',0));
 SELECT denial_message INTO v_message FROM public.journal_voice_requests WHERE user_id=p_user AND status='denied' ORDER BY created_at DESC LIMIT 1;
 IF FOUND THEN RAISE EXCEPTION '%',COALESCE(v_message,'Voice processing access must be restored before starting a new recording'); END IF;
 IF (SELECT count(*) FROM public.journal_voice_requests WHERE user_id=p_user AND created_at>now()-interval '1 minute')>=3 THEN RAISE EXCEPTION 'Please wait a minute before recording again'; END IF;
 INSERT INTO public.journal_voice_requests(user_id) VALUES(p_user) RETURNING id INTO v_id;RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_journal_voice(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_journal_voice(uuid) TO service_role;
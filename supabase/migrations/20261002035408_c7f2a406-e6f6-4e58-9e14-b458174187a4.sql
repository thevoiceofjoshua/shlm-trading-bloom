CREATE OR REPLACE FUNCTION public.record_weekly_behavior_tick(p_date date, p_weekday smallint, p_reading jsonb, p_last_bar_ts bigint, p_candidates jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_reading jsonb; old_ts bigint := 0; candidate jsonb; event_message text; event_key text; note_label text; old_note text; first_tick boolean;
BEGIN
  IF p_weekday < 1 OR p_weekday > 5 OR p_last_bar_ts < 0 OR jsonb_typeof(p_candidates) <> 'array' THEN RAISE EXCEPTION 'Invalid tick'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_date::text || ':weekly-behavior', 0));
  SELECT reading, last_bar_ts INTO old_reading, old_ts FROM public.weekly_behavior_state WHERE session_date = p_date;
  first_tick := old_reading IS NULL;
  old_ts := coalesce(old_ts, 0);
  IF old_reading IS NULL THEN old_reading := '{}'::jsonb; END IF;
  IF p_last_bar_ts <= old_ts THEN RETURN; END IF;
  IF NOT first_tick AND (
     ((p_reading->>'label') IS NOT NULL AND (p_reading->>'label') IS DISTINCT FROM (old_reading->>'label')) OR
     ((p_reading->>'label') IS NOT NULL AND (p_reading->>'developing') IS DISTINCT FROM (old_reading->>'developing'))) THEN
    event_message := upper(left(to_char(p_date, 'Dy'), 3)) || ' — Classified: ' || (p_reading->>'label') || CASE WHEN p_reading->>'developing' = 'true' THEN ' (developing)' ELSE '' END;
    event_key := p_date::text || ':classification:' || p_last_bar_ts;
    INSERT INTO public.weekly_behavior_events(session_date, weekday, kind, message, event_key) VALUES (p_date, p_weekday, 'classification', event_message, event_key) ON CONFLICT (event_key) DO NOTHING;
  END IF;
  note_label := p_reading->>'note'; old_note := old_reading->>'note';
  IF NOT first_tick AND note_label IS NOT NULL AND note_label IS DISTINCT FROM old_note THEN
    event_key := p_date::text || ':caution:' || p_last_bar_ts;
    INSERT INTO public.weekly_behavior_events(session_date, weekday, kind, message, event_key) VALUES (p_date, p_weekday, 'caution', upper(left(to_char(p_date, 'Dy'), 3)) || ' — Caution: ' || note_label || ' read emerging', event_key) ON CONFLICT (event_key) DO NOTHING;
  END IF;
  IF NOT first_tick THEN
    FOR candidate IN SELECT value FROM jsonb_array_elements(p_candidates) LOOP
      IF (candidate->>'ts')::bigint <= old_ts THEN CONTINUE; END IF;
      IF candidate->>'kind' NOT IN ('detected', 'confirmed', 'canceled') THEN CONTINUE; END IF;
      event_key := p_date::text || ':' || (candidate->>'kind') || ':' || (candidate->>'ts') || ':' || coalesce(candidate->>'side', '');
      event_message := upper(left(to_char(p_date, 'Dy'), 3)) || ' — ' || (candidate->>'message');
      INSERT INTO public.weekly_behavior_events(session_date, weekday, kind, message, event_key) VALUES (p_date, p_weekday, candidate->>'kind', event_message, event_key) ON CONFLICT (event_key) DO NOTHING;
    END LOOP;
  END IF;
  INSERT INTO public.weekly_behavior_state(session_date, reading, last_bar_ts) VALUES (p_date, p_reading, p_last_bar_ts)
  ON CONFLICT (session_date) DO UPDATE SET reading = EXCLUDED.reading, last_bar_ts = EXCLUDED.last_bar_ts;
  DELETE FROM public.weekly_behavior_events WHERE session_date < p_date - 7;
  DELETE FROM public.weekly_behavior_state WHERE session_date < p_date - 7;
END $$;
REVOKE ALL ON FUNCTION public.record_weekly_behavior_tick(date, smallint, jsonb, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_weekly_behavior_tick(date, smallint, jsonb, bigint, jsonb) TO service_role;
DROP FUNCTION IF EXISTS public.reserve_recruiter_payout(uuid, text, integer, integer, uuid);
CREATE FUNCTION public.reserve_recruiter_payout(p_recruiter uuid, p_mode text, p_amount_cents integer, p_rate_cents integer, p_bonus_per integer, p_bonus_cents integer, p_created_by uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE earned bigint; bonus bigint; paid bigint; new_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_recruiter::text || ':payout', 0));
  SELECT coalesce(sum(delta),0)::bigint * p_rate_cents INTO earned FROM public.recruiter_lands WHERE recruiter_id = p_recruiter;
  -- Stacking monthly bonus: one bonus per full p_bonus_per landed in each calendar month.
  SELECT coalesce(sum(greatest(m.total, 0) / p_bonus_per), 0)::bigint * p_bonus_cents INTO bonus
    FROM (SELECT sum(delta) AS total FROM public.recruiter_lands WHERE recruiter_id = p_recruiter GROUP BY month) m;
  earned := earned + bonus;
  SELECT coalesce(sum(amount_cents),0) INTO paid FROM public.recruiter_payouts
    WHERE recruiter_id = p_recruiter AND mode = p_mode AND status NOT IN ('failed','cancelled');
  IF p_amount_cents <= 0 OR p_amount_cents > earned - paid THEN RAISE EXCEPTION 'Amount exceeds what is owed'; END IF;
  INSERT INTO public.recruiter_payouts (recruiter_id, mode, amount_cents, created_by)
  VALUES (p_recruiter, p_mode, p_amount_cents, p_created_by) RETURNING id INTO new_id;
  RETURN new_id;
END $function$;
REVOKE ALL ON FUNCTION public.reserve_recruiter_payout(uuid, text, integer, integer, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_recruiter_payout(uuid, text, integer, integer, integer, integer, uuid) TO service_role;
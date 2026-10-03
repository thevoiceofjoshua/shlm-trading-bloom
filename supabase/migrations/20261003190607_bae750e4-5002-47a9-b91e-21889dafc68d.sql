CREATE TABLE public.wise_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL UNIQUE CHECK (mode IN ('sandbox','live')),
  token_cipher text NOT NULL,
  token_iv text NOT NULL,
  profile_id bigint NOT NULL,
  profile_name text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wise_connection TO service_role;
ALTER TABLE public.wise_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server manages wise connection" ON public.wise_connection FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.wise_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_mode text NOT NULL DEFAULT 'sandbox' CHECK (active_mode IN ('sandbox','live')),
  sandbox_verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wise_settings TO service_role;
ALTER TABLE public.wise_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server manages wise settings" ON public.wise_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.wise_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.recruiter_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('sandbox','live')),
  wise_recipient_id bigint NOT NULL,
  holder_name text NOT NULL,
  bank_name text,
  last4 text,
  currency text NOT NULL,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recruiter_id, mode)
);
GRANT SELECT ON public.recruiter_bank_accounts TO authenticated;
GRANT ALL ON public.recruiter_bank_accounts TO service_role;
ALTER TABLE public.recruiter_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters read own bank summary" ON public.recruiter_bank_accounts FOR SELECT TO authenticated USING (recruiter_id = auth.uid());
CREATE TRIGGER update_recruiter_bank_accounts_updated_at BEFORE UPDATE ON public.recruiter_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recruiter_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('sandbox','live')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  target_currency text,
  target_amount numeric,
  fee numeric,
  rate numeric,
  quote_id text,
  wise_transfer_id bigint,
  customer_transaction_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','awaiting_funding','completed','failed','cancelled')),
  wise_status text,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recruiter_payouts_recruiter_idx ON public.recruiter_payouts (recruiter_id);
CREATE INDEX recruiter_payouts_transfer_idx ON public.recruiter_payouts (wise_transfer_id);
GRANT SELECT ON public.recruiter_payouts TO authenticated;
GRANT ALL ON public.recruiter_payouts TO service_role;
ALTER TABLE public.recruiter_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters read own payouts" ON public.recruiter_payouts FOR SELECT TO authenticated USING (recruiter_id = auth.uid());
CREATE TRIGGER update_recruiter_payouts_updated_at BEFORE UPDATE ON public.recruiter_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wise_connection_updated_at BEFORE UPDATE ON public.wise_connection FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wise_settings_updated_at BEFORE UPDATE ON public.wise_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomically reserve a payout: locks per recruiter, checks owed, inserts pending row.
CREATE OR REPLACE FUNCTION public.reserve_recruiter_payout(p_recruiter uuid, p_mode text, p_amount_cents int, p_rate_cents int, p_created_by uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE earned bigint; paid bigint; new_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_recruiter::text || ':payout', 0));
  SELECT coalesce(sum(delta),0)::bigint * p_rate_cents INTO earned FROM public.recruiter_lands WHERE recruiter_id = p_recruiter;
  SELECT coalesce(sum(amount_cents),0) INTO paid FROM public.recruiter_payouts
    WHERE recruiter_id = p_recruiter AND mode = p_mode AND status NOT IN ('failed','cancelled');
  IF p_amount_cents <= 0 OR p_amount_cents > earned - paid THEN RAISE EXCEPTION 'Amount exceeds what is owed'; END IF;
  INSERT INTO public.recruiter_payouts (recruiter_id, mode, amount_cents, created_by)
  VALUES (p_recruiter, p_mode, p_amount_cents, p_created_by) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.reserve_recruiter_payout(uuid,text,int,int,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_recruiter_payout(uuid,text,int,int,uuid) TO service_role;
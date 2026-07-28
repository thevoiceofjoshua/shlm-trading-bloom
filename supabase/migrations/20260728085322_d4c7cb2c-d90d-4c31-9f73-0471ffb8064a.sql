ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_link_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_link_status TEXT NOT NULL DEFAULT 'not_sent';

UPDATE public.applications SET payment_link_status = 'not_sent' WHERE payment_link_status IS NULL;

CREATE INDEX IF NOT EXISTS applications_payment_link_status_idx ON public.applications(payment_link_status);
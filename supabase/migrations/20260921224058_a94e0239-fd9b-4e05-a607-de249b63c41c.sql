ALTER TABLE public.tradovate_connections DROP CONSTRAINT IF EXISTS tradovate_connections_user_id_key;
ALTER TABLE public.tradovate_connections ADD COLUMN IF NOT EXISTS label text;
CREATE INDEX IF NOT EXISTS tradovate_connections_user_id_idx ON public.tradovate_connections (user_id);
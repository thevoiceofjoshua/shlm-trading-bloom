-- Tradovate connections: server-only, never readable by any browser session.
CREATE TABLE public.tradovate_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'live',
  account_id bigint,
  account_name text,
  credentials_cipher text NOT NULL,
  credentials_iv text NOT NULL,
  access_token_cipher text,
  access_token_iv text,
  token_expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.tradovate_connections TO service_role;
ALTER TABLE public.tradovate_connections ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies for anon/authenticated: only service_role server code may access.

CREATE TRIGGER update_tradovate_connections_updated_at
BEFORE UPDATE ON public.tradovate_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Passkeys (biometric sign-in devices)
CREATE TABLE public.user_passkeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text,
  device_label text NOT NULL DEFAULT 'This device',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.user_passkeys TO authenticated;
GRANT ALL ON public.user_passkeys TO service_role;
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own passkeys"
ON public.user_passkeys FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Members can remove their own passkeys"
ON public.user_passkeys FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_passkeys_updated_at
BEFORE UPDATE ON public.user_passkeys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short-lived WebAuthn challenges: server-only.
CREATE TABLE public.webauthn_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge text NOT NULL UNIQUE,
  user_id uuid,
  kind text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: server-only.

CREATE INDEX idx_user_passkeys_user_id ON public.user_passkeys(user_id);
CREATE INDEX idx_webauthn_challenges_expires_at ON public.webauthn_challenges(expires_at);
CREATE TABLE public.journal_vault_passcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passcode_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_vault_passcodes TO authenticated;
GRANT ALL ON public.journal_vault_passcodes TO service_role;

ALTER TABLE public.journal_vault_passcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own journal vault passcode"
ON public.journal_vault_passcodes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_journal_vault_passcodes_updated_at
BEFORE UPDATE ON public.journal_vault_passcodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
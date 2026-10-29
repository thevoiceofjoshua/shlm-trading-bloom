-- Bible Study: store the member's login name so the Members list can show names instead of IDs.
ALTER TABLE public.bible_memberships ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.bible_memberships.display_name IS 'Name shown to administrators in the Bible Study Members list; taken from the account sign-in metadata.';

UPDATE public.bible_memberships m
SET display_name = COALESCE(
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''),
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data ->> 'name', '')), ''),
  NULLIF(TRIM(COALESCE(u.email, '')), ''),
  'Member'
)
FROM auth.users u
WHERE u.id = m.user_id;

UPDATE public.bible_memberships SET display_name = 'Member' WHERE display_name IS NULL;
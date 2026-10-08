ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referred_by_recruiter_id uuid, ADD COLUMN IF NOT EXISTS referred_by_name text;
ALTER TABLE public.recruiter_lands ADD COLUMN IF NOT EXISTS application_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS recruiter_lands_application_id_key ON public.recruiter_lands(application_id) WHERE application_id IS NOT NULL;
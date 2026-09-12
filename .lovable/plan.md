# Move the backend to your own Supabase project

Goal: stop using Lovable Cloud's built-in backend and run everything on a Supabase project you own inside your "SHLM Trading" organization.

## What I found

Your current data is small and easy to move:

| Table | Rows |
| --- | --- |
| applications | 3 |
| daily_levels | 9 |
| member_notes | 13 |
| member_rules | 3 |
| purchases | 0 |
| reviews | 6 |
| session_reviews | 6 |
| site_stats | 1 |
| user_roles | 2 |
| accounts (sign-ups) | 3 |

There is also one private file area used for journal screenshots.

## Two things I cannot do from here (you must click them)

1. **Create the new project in your organization.** I have no tool that creates a project inside your own Supabase organization. Please create it yourself (name it e.g. "shlm-production", pick a region close to your users, and save the database password somewhere safe).
2. **Switch this app over to it.** The connection between this Lovable project and a backend is a settings-level switch, not something I can edit in code. After the new project exists, you connect it in this project's settings (Integrations → Supabase) and disconnect Lovable Cloud. Everything after that I can do.

I'd rather flag this up front than half-build it and leave you stuck.

## What I will do

**Step 1 — Prepare an exact copy of the structure.**
I'll produce one setup script that recreates, byte-for-byte in behaviour: the 9 tables and every column, the role type (admin / user / shlm_mod), the two helper functions, the update trigger, all row-level access rules, and the table permissions. You paste it into the new project's SQL editor (or I run it once the project is connected).

**Step 2 — Export and re-insert your data.**
I'll export every row from the 9 tables above into a second script, in the right order so references stay valid. Same IDs, same values — nothing renumbered.

**Step 3 — Move the 3 accounts.**
Passwords are stored as one-way hashes, so I can copy the accounts across with their existing IDs and hashes only if I can reach the new project's admin credentials. If that path is blocked, the fallback is: I recreate the 3 accounts and each person sets a new password once via "forgot password". Your 2 role assignments and all journal data stay attached either way, because I keep the same account IDs. I'll tell you which route applied.

**Step 4 — Re-point the app.**
Once connected, the app's backend address and public key update, and I re-verify every place that talks to the backend: sign-in, the member dashboard, the SHLM Centre and journal, the application form endpoint, the four admin endpoints, and the four checkout endpoints.

**Step 5 — Re-add the settings that don't travel with the data.**
New project means these start empty and must be set again: email/password sign-in and Google sign-in, the journal screenshot storage area and its access rules, and the private keys (Stripe live key, Stripe webhook secret, admin passcodes, notification email, AI key). I'll list exactly which ones and set the ones I can.

**Step 6 — Test, then publish.**
I'll run through sign-up, sign-in, an application submission, admin approval, journal save with a screenshot, and a test checkout before we call it done.

## Things worth knowing

- **Journal screenshots**: the files themselves live in the old project's storage. If there are any uploaded shots you want kept, I'll need to download and re-upload them; tell me if this matters or if losing old screenshots is fine.
- **Stripe**: your Stripe account is unaffected, but the payment webhook points at your site, not at the backend, so no change needed there. Past payments stay in Stripe.
- **Downtime**: expect a short window during the switch where sign-in fails. Best done outside market hours.
- **Cost**: the new project bills to your own Supabase account instead of Lovable Cloud.

## Technical notes

- Schema recreation includes: `app_role` enum, `has_role()` and `update_updated_at_column()` (search_path pinned), `update_member_rules_updated_at` trigger, all existing policies verbatim, and GRANTs per table matching current roles (`anon` only on `reviews` and `site_stats`).
- Auth migration copies `auth.users` rows (id, email, encrypted_password, confirmation state, metadata) plus matching `auth.identities` rows; requires the new project's service role key.
- Code changes are limited to environment/binding values plus the storage bucket recreation (`journal-shots`, private, with owner-scoped `storage.objects` policies). Server-side code paths (`*.server.ts`, `/api/public/*`) keep using `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` and need no rewrite — they just resolve to the new project.

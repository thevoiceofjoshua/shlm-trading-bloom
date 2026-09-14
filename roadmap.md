# Roadmap

## Migrate backend to user-owned Supabase project ("SHLM Trading" org) — shlm-production (ugnyssxvtwvbbckycmru)
- [x] New Supabase project created and connected
- [x] Schema recreated: 9 tables, enum, functions, trigger, RLS policies, GRANTs
- [x] All 43 rows copied (applications 3, daily_levels 9, member_notes 13, member_rules 3, purchases 0, reviews 6, session_reviews 6, site_stats 1, user_roles 2)
- [x] 3 auth users + identities migrated with original IDs (Google accounts intact; QA email account has no password)
- [x] journal-shots bucket recreated (private) + 3 owner-scoped policies
- [x] All 9 journal screenshots re-uploaded to identical paths (14,728,633 bytes verified)
- [x] Project ref updated in supabase/config.toml and wrangler.jsonc
- [x] Verified: all pages load, public reviews read, live Stripe checkout session created
- [ ] USER: enable Google sign-in provider + email sign-in in the shlm-production Supabase dashboard (Authentication → Providers) — no agent tool for user-managed projects
- [ ] USER: enable leaked-password protection (Authentication → Policies)
- [ ] Publish once sign-in providers are enabled

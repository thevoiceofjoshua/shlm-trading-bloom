# Roadmap

## Migrate backend to user-owned Supabase project ("SHLM Trading" org)
- [ ] User creates new Supabase project in their org (manual)
- [ ] User connects it to this Lovable project / disconnects Lovable Cloud (manual)
- [ ] Recreate schema: 9 tables, enum, functions, trigger, RLS policies, GRANTs
- [ ] Copy all rows (applications, daily_levels, member_notes, member_rules, purchases, reviews, session_reviews, site_stats, user_roles)
- [ ] Migrate 3 auth users (ids + password hashes, identities)
- [ ] Recreate journal-shots bucket + policies
- [ ] Download and re-upload all 9 journal screenshots (~14.7 MB) preserving paths
- [ ] Re-set secrets (Stripe live key, webhook secret, admin passcodes, notification email, AI key)
- [ ] Re-enable email + Google sign-in
- [ ] End-to-end test, then publish

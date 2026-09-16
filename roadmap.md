# Roadmap

## Homepage vault boot and embedded sign-in
- [x] Add the homepage-only terminal boot screen with spinning SHLM logo
- [x] Reuse existing email/password, account creation, and Google sign-in behavior
- [x] Add skip and successful vault-opening paths into the public homepage
- [x] Verify logged-out, signed-in, mobile, and unchanged `/auth` and journal flows

## Migrate backend to user-owned Supabase project ("SHLM Trading" org) — shlm-production (ugnyssxvtwvbbckycmru)
- [x] New Supabase project created and connected
- [x] Schema recreated: 9 tables, enum, functions, trigger, RLS policies, GRANTs
- [x] All 43 rows copied
- [x] 3 auth users + identities migrated with original IDs
- [x] journal-shots bucket recreated (private) + owner-scoped policies; all 9 screenshots verified
- [x] Project ref updated in supabase/config.toml and wrangler.jsonc
- [x] Google + email sign-in enabled (real Google client ID/secret, callback added)
- [x] Full end-to-end test passed: all pages, public reviews/stats reads, email sign-up + delete, Google OAuth handoff, application submit, admin list/approve/remove, MOD lockout, Stripe checkout (main/test/extension) and enrollment redirect
- [x] Published
- [ ] Leaked-password protection: skipped (Supabase Pro-plan feature; Free plan)

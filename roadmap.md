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

## Per-user journal vault passcode
- [x] Add `journal_vault_passcodes` table with SHA-256 hashes and per-user RLS
- [x] Add authenticated server functions: status, setup, verify
- [x] Rewrite `JournalVaultGate` with setup + verify modes
- [x] Pre-set passcodes for mikestaten29@gmail.com (11711) and joschewagner56@gmail.com (090999)
- [x] Build passes and rows verified

## Embedded admin access on homepage vault
- [x] Add a distinct inline ADMIN ACCESS section below member sign-in
- [x] Reuse authenticated staff-role and server-verified passcode checks
- [x] Preserve member sign-in/create-account and Google return intent
- [x] Verify regular member controls, admin credential states, desktop/mobile layout, and clean build
- [ ] Live Founder and SHLM MOD unlock checks require signing into the externally managed Supabase accounts
- [x] Apply Emerald Vault styling only to all credential areas (sign-in, sign-up, admin access, journal passcode)

## Morning high-impact news spotlight
- [x] Add today's pre-noon Pacific high-impact releases above the full economic calendar
- [x] Verify desktop and phone layout rules, role parity, and clean build

## Grayscale terminal theme and homepage coded background
- [x] Recolor every vault and credential surface to black, white, and gray
- [x] Add the animated scanline and coded-grid treatment to the marketing homepage
- [x] Verify all terminal surfaces and homepage behavior on phone and desktop

## Mobile-responsive vault and credential screens
- [x] Make every vault surface fit narrow and short phone viewports without pinch zoom
- [x] Prevent mobile input-focus zoom and keep all controls reachable
- [x] Verify all credential surfaces at 320×568 and 390×844 across member, SHLM MOD, and Founder views

## Mobile-responsive unlocked Trading Journal
- [x] Make the calendar, day view, entry forms, trades, screenshots, and totals fit narrow phones
- [x] Prevent iPhone input-focus zoom and make journal overlays safe-area-aware
- [x] Verify shared member, SHLM MOD, and Founder journal presentation and clean build
- [ ] Live 320×568 and 390×844 authenticated checks require signing into the externally managed Supabase preview

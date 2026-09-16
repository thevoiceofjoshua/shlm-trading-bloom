# Embedded admin access on the homepage vault

## Goal

Add a distinct terminal-styled **ADMIN ACCESS** area at the bottom of the existing homepage vault boot screen. Keep regular member sign-in and account creation unchanged, while allowing authorized staff to authenticate and unlock their role before the homepage opens—without the current follow-up pop-up.

## 1. Add the admin section to the boot screen

Extend `HomepageVaultBoot` with a visually separated admin access band below the existing member controls.

- Match the current green/amber terminal styling, borders, status text, loading states, and opening animation.
- Clearly label it `ADMIN ACCESS` so it cannot be confused with member sign-in.
- Keep the regular Sign in / Create account panel, Google button, and Explore option exactly as available today.
- Keep the section inline within the boot screen on desktop and mobile; no modal or separate pop-up.

## 2. Complete founder authentication inline

Use the existing Supabase account authentication and the existing server-verified admin passcode check.

- When signed out, the admin section offers account sign-in using email/password and Google, followed by the admin passcode in the same section.
- Preserve an “admin access requested” state across the Google redirect so returning to `/` continues directly to the inline passcode step instead of opening the homepage first.
- When already signed in with an authorized staff account, show the passcode step immediately.
- Reject non-staff accounts with a clear inline message and do not expose admin controls.
- On a correct passcode, activate the existing admin session state, play the vault-opening transition, and reveal the homepage with the existing admin bar active.
- Keep role boundaries unchanged: Founder receives full admin access; SHLM MOD retains its existing restricted/read-only scope.

## 3. Remove the automatic homepage founder prompt

Prevent the current “Enter SHLM Founder mode?” prompt from appearing automatically after homepage sign-in.

- The homepage boot screen becomes the primary admin-entry path.
- Regular member sign-in from the boot screen opens the homepage as a member, even when the account also has a staff role.
- Preserve the existing account-menu action for entering or exiting staff mode later; manually requesting it can still use the existing prompt outside the boot flow.
- Do not change `/auth`, journal vault access, admin authorization rules, passcodes, or database policies.

## 4. Verification

Test on desktop and mobile:

- Regular member sign-in, account creation, Google sign-in, and Explore still work.
- Admin email/password and Google flows return to the inline passcode step.
- Incorrect account credentials, non-staff accounts, and incorrect passcodes stay on the boot screen with clear errors.
- Founder unlock opens the homepage with full admin controls.
- SHLM MOD unlock opens with the existing restricted controls.
- No automatic founder pop-up appears after homepage member sign-in.
- The account-menu manual admin entry still works after the homepage is open.
- Reduced-motion and keyboard navigation remain usable.

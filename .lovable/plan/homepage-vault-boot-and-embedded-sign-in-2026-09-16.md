# Homepage vault boot and embedded sign-in

## Goal

Add a homepage-only opening screen that introduces SHLM with a terminal-style boot sequence, lets visitors sign in or create an account, and always provides an obvious way into the public marketing site without an account.

## 1. New homepage boot screen

Create a focused `HomepageVaultBoot` component and render it before the existing `/` homepage content.

- Full-viewport dark terminal presentation using the Journal vault’s green/amber monospace language, scanlines, subtle glitch/reveal motion, and restrained SHLM branding.
- Use the existing SHLM logo asset as the focal boot element, with a smooth spin during startup/authentication.
- Sequence short boot/status lines before settling into the account controls.
- Include reduced-motion behavior so the sequence remains usable without animation.
- Keep this separate from `JournalVaultGate`; that component and its passcode behavior remain untouched.

## 2. Embedded account access

Reproduce the existing `/auth` behavior inside the boot screen without changing `/auth` itself.

- Sign-in mode: email, password, submit, and “Continue with Google.”
- Create-account mode: full name, email, password, the same 8-character minimum, and the same Supabase sign-up metadata.
- Toggle between “Sign in” and “Create account” on the same screen.
- Reuse the current Google OAuth behavior and return URL so Google sends the visitor back to `/`.
- Show loading, validation, Supabase errors, and the existing email-confirmation notice inline.
- No profile table or additional profile data; retain the current full-name metadata only.

Email confirmation remains exactly as it works on `/auth`: if Supabase returns an active session, continue immediately; if confirmation is required, show “check your email,” switch to sign-in mode, and keep the boot screen available until the account is confirmed and signed in.

## 3. Skip and successful opening

- Add a prominent “Explore without signing in” action that immediately plays the short opening transition and reveals the existing public homepage.
- After a successful email/password sign-in, animate an “ACCESS GRANTED” decrypt/vault-opening sequence, then reveal the homepage in place.
- Google OAuth leaves for Google as normal; when it returns to `/` with an authenticated session, recognize that session, play the same opening transition, and reveal the signed-in homepage.
- Keep the existing homepage mounted only after the intro clears, so marketing content does not visually flash behind the gate.
- The header will use the existing account state and show the signed-in account menu after authentication.

## 4. Visit behavior and scope

- Show the boot screen whenever a visitor lands on or reloads `/`, including signed-in visitors; signed-in visitors get a streamlined “session verified” opening rather than another credential form.
- Skipping is scoped to the current page load only; a future fresh visit to `/` shows the intro again, satisfying the “every visitor” requirement without storing a permanent bypass.
- Direct visits to `/auth`, `/centre`, `/program`, and every other route behave exactly as they do today.
- No database, storage, role, journal, or server changes.

## 5. Verification

Test at desktop and mobile sizes:

- Logged-out load of `/` shows the boot screen before any marketing content.
- Skip reveals the complete homepage and all existing links, application actions, pricing, and navigation still work.
- Sign-in failure stays on the screen with a clear error.
- Email/password sign-in plays the opening transition and reveals the homepage with the account menu.
- Create account follows the existing email-confirmation behavior and stores the full name metadata.
- Google starts the existing OAuth flow and returns to `/`; an authenticated return opens into the signed-in homepage.
- Signed-in reload still shows a brief boot/session-verification opening, without asking for credentials.
- Reduced-motion mode, keyboard navigation, focus visibility, and narrow screens remain usable.
- `/auth` and the journal passcode gate are unchanged.

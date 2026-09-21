# Tradovate auto-fill for journal entries + biometric sign-in

Two separate additions. Part 1 lets each member connect their Tradovate account once and pull real fills into a journal entry. Part 2 adds Face ID / fingerprint sign-in on devices that support it.

## Part 1 — Connect Tradovate

### How credentials are protected

This is the part to review first.

- The member enters their Tradovate username, password, API key/secret and CID once, in a "Connect Tradovate" panel.
- Those values are sent straight to a server-side action and are **encrypted before they are written down** using AES-256-GCM with a key held only in our secure server settings (a newly generated secret, never in the codebase, never in the browser).
- They are stored in a new private table that **no signed-in browser session can read or write** — only trusted server code with the service key can touch it. Even the owner of the record cannot read it back.
- Nothing ever sends the credentials back to the browser. The panel only shows status: connected / not connected, which account, when it was last used, and a "Disconnect" button that deletes the row.
- The login token Tradovate returns is cached server-side with its expiry and renewed automatically in the background when stale, so the credentials are only used when a new token is genuinely needed.
- Disconnect deletes the encrypted record and the cached token immediately.

### Pulling fills into an entry

- In the journal entry form, a new "Pull from Tradovate" button sits above the trade rows. It fetches that day's fills for the selected session window (NY Open or Asia Session) for the connected account.
- Returned fills are grouped into round-trip trades and mapped onto the existing trade rows: instrument, direction, result, P&L, plus the entry/exit prices, size and fill time recorded in the trade note line. The session total refreshes from the trades as it does today.
- Everything stays editable: the member reviews and adjusts before saving. Nothing saves automatically.
- If Tradovate returns nothing, the panel says so plainly — e.g. "No fills found for this window. Tradovate sometimes reports nothing for demo accounts or outside market hours." — with a retry and an option to widen to the whole trading day. Credential failures, expired add-on and rate limits each get their own clear message. Manual entry always remains available.
- Available to every role: Member, Free member, SHLM MOD and Founder. Each person connects only their own account; one member can never see another's data.

## Part 2 — Face ID / fingerprint sign-in

- On devices that support it, the sign-in screens gain a "Sign in with Face ID / fingerprint" button, shown only when the device actually supports it.
- After signing in normally once, a member can register this device from their account settings ("Add this device"). Registration stores only a public device credential — no fingerprint or face data ever leaves the device, and we never receive it.
- On later visits, the button signs them in with one prompt, no typing. Email and password and Google sign-in stay exactly as they are; this is an extra option, not a replacement.
- Members can list and remove their registered devices.

## What does not change

- Journal vault passcodes, the terminal look, manual journal entry, roles, admin panel, pricing and checkout all stay as they are.

## Technical notes

- New table `tradovate_connections` (one row per user): ciphertext, iv, auth tag, environment (demo/live), account id/name, cached access token + expiry, timestamps. No `anon`/`authenticated` grants; RLS on with no permissive policies; `GRANT ALL ... TO service_role` only. Encryption via WebCrypto AES-GCM with a generated `TRADOVATE_ENC_KEY` secret.
- `src/lib/tradovate.server.ts`: encrypt/decrypt, `POST /v1/auth/accesstokenrequest` (demo + live base URLs), token cache with renewal, `fill/list` + `order/list` + `fillFee/list` fetch, round-trip pairing. `src/lib/tradovate.functions.ts`: `getTradovateStatus`, `connectTradovate`, `disconnectTradovate`, `importTradovateFills` — all behind `requireSupabaseAuth`, identity always from the session, admin client loaded inside handlers.
- Journal UI: `TradovateImport` control in `src/components/hub/Journal.tsx` mapping imported trades onto the existing `Trade[]` shape; settings panel component reused on the dashboard.
- Passkeys: new table `user_passkeys` (user id, credential id, public key, counter, device label, created/last used), owner-scoped RLS for listing/removal. `@simplewebauthn/server` for registration/authentication challenge verification in server functions; sign-in completes by issuing a one-time verified session for that verified user, then the browser stores it through the normal Supabase client. Registration requires an existing authenticated session, so a passkey can never be attached to an account the member isn't signed into.
- All new tables get explicit GRANTs in the same migration.

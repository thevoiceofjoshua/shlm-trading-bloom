# Admin Mode for the Whole Store

Goal: when you log in with joschewagner56@gmail.com, you get the option to enter Admin Mode before browsing, which unlocks every page and function of the store so you can manually test them end to end.

## How it works for you

1. Sign in normally at `/auth`.
2. Because your account is flagged as an admin, a prompt appears right after sign-in: "Enter admin mode?" with Enter admin mode / Continue as member.
3. Choosing admin mode asks for your admin passcode once. After that, admin mode stays on for the rest of that browser session.
4. A slim admin bar is pinned to the top of every page while admin mode is on. It shows: ADMIN MODE, your email, the current route, and quick links to Admin applications, Dashboard, SHLM Centre, Test checkout. It has a "View as member" toggle and an "Exit admin mode" button.
5. "View as member" temporarily drops the admin unlock so you can confirm the gates actually block a normal user, then flip back with one click.
6. Admin mode can also be entered any time from your avatar menu, so you don't have to sign out to get the prompt again.

## What admin mode unlocks

- Member dashboard: full access even without a purchase, with progress/extension panels visible.
- SHLM Centre: full hub (session bar, market boards, economic calendar, AI analyst, bias journal) without a paid membership.
- Success page, enroll page and any other gated screen: viewable for inspection instead of bouncing to pricing.
- Admin applications page: no separate passcode entry — it reuses the passcode you already entered when entering admin mode.
- Test checkout: linked from the admin bar so you can run the $0.50 live Stripe test whenever you want.
- Everything visible in admin mode is labeled so you never confuse an admin preview with a real member state.

## Safety rules

- Admin role lives in the database (`user_roles`), not in the browser, so nobody can fake it by editing local storage.
- The passcode is still required for actions that touch real customers (approve applicant, send/resend payment link email, deny, remove). Verification happens on the server every time.
- Admin mode never charges cards or emails clients by itself; it only unlocks screens and, when used, the actions you explicitly click.
- Admin bar and admin-only unlocks never appear for regular members or visitors.

## Technical detail

Database migration
- Insert an `admin` row in `public.user_roles` for the auth user with email `joschewagner56@gmail.com` (select the id from `auth.users`, `ON CONFLICT DO NOTHING`). No schema change needed; `has_role` already exists.

New files
- `src/hooks/use-admin-mode.ts` — client hook: `isAdmin` (from `has_role` RPC on the signed-in user), `adminMode`, `viewAsMember`, `enter(passcode)`, `exit()`, `toggleViewAsMember()`. Persists a non-authoritative flag in `sessionStorage` (`shlm.adminMode`, plus the passcode kept in memory/sessionStorage only for this tab).
- `src/lib/admin-mode.functions.ts` — `verifyAdminPasscode` server fn: `.middleware([requireSupabaseAuth])`, checks `has_role(userId, 'admin')` then compares the passcode against `ADMIN_PASSCODE`; returns `{ ok }` only.
- `src/components/AdminBar.tsx` — fixed top bar rendered from `__root.tsx`, only when `isAdmin && adminMode`. Adds top padding to the layout so it never covers the nav/promo banner.
- `src/components/AdminModePrompt.tsx` — post-login dialog (shown once per session when `isAdmin` and no decision recorded yet) plus passcode field.

Edited files
- `src/routes/__root.tsx` — render `AdminBar` and `AdminModePrompt`; keep existing dark theme and promo banner.
- `src/components/AccountMenu.tsx` — add "Enter admin mode" / "Exit admin mode" item, visible only when `isAdmin`.
- `src/lib/hub.functions.ts` — already returns `isAdmin: true` access for admins; extend the response with an `adminPreview` flag so `/centre` labels the state.
- `src/routes/centre.tsx`, `src/routes/dashboard.tsx`, `src/routes/success.tsx`, `src/routes/enroll.$applicationId.tsx` — when the signed-in user is admin and admin mode is on (and not "view as member"), skip the membership/approval gate and render the full UI with a small "Admin preview" tag. Auth gates stay in place; only the paid-membership gate is bypassed.
- `src/routes/admin.tsx` — if admin mode is active, seed the passcode from the admin-mode session instead of prompting again; keep the manual passcode form as a fallback.

Server-side authority
- All bypasses re-check `has_role` on the server (`requireSupabaseAuth` + RPC) before returning gated data; the client flag alone never unlocks data.
- RLS policies and the existing passcode checks in `src/lib/admin.functions.ts` are unchanged.

Verification
- `tsgo --noEmit`, then a Playwright pass: signed-out visitor still redirected from `/dashboard` and `/centre`; admin session sees the bar, reaches both pages, and "View as member" restores the gate.

# Read-only Centre admin for mikestaten29@gmail.com

Give that account admin-style access to the SHLM Centre — unlocked with an admin password — while making it impossible for them to change anything in the program (no application approvals, no denials, no removals, no emails sent, no member data edits).

## How it will work

1. A new restricted role is added: `centre_admin`. It grants full Centre access (all boards, analyst, calendar, journal) and nothing else.
2. `mikestaten29@gmail.com` (existing account, created July 28) is assigned that role.
3. They get their own admin password, separate from yours. Yours keeps unlocking the applications console; theirs only unlocks the Centre. Even if they typed your password, the role check stops them from managing applications.
4. On sign-in they see the same "Enter admin mode?" prompt and a slimmed admin bar labelled "Centre access (read-only)". No approve/deny/resend controls appear, and the `/admin` page stays blocked for them.
5. Their own journal notes still save (that is their own data, not program data).

## Technical details

Database migration:
- Add `centre_admin` to the `app_role` enum.
- Insert a `user_roles` row for user `4acfe73b-af0d-4492-ac95-55a759b6c99e` with role `centre_admin`.

Server-side gating:
- `src/lib/hub.functions.ts` — `checkAccess` treats `centre_admin` as Centre-granted (`hasAccess: true`) and returns a new `readOnly: true` flag; `isAdmin` stays false so no admin-only affordances light up.
- `src/lib/admin-mode.functions.ts` — `verifyAdminPasscode` resolves the caller's role first: `admin` is checked against `ADMIN_PASSCODE`, `centre_admin` against a new `CENTRE_ADMIN_PASSCODE` secret. Returns `{ ok, scope: "full" | "centre" }`. Anything else returns `not-admin`.
- `src/lib/admin.functions.ts` (list/approve/deny/remove/resend) — keeps the passcode check and additionally requires the caller to hold the `admin` role, so a centre password can never reach these mutations.

Client:
- `src/hooks/use-admin-mode.ts` — track `scope` in session storage; expose `centreOnly`. `adminUnlocked` stays true for Centre reads.
- `src/components/AdminBar.tsx` / `AdminModePrompt.tsx` — copy and controls adapt when `centreOnly`, hiding the applications link and "view as member" toggle.
- `src/routes/admin.tsx` — shows a "not authorized" state for centre-only sessions.

Secret: generate `CENTRE_ADMIN_PASSCODE` and share it with them; your `ADMIN_PASSCODE` is unchanged.

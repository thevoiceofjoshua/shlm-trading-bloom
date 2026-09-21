# Manage roles in the Founder admin panel

Add a "Manage roles" section to `/admin` so you can see every signed-up account and change its role yourself, instead of editing the database.

## What you'll see

- A list of all accounts: email, name (when available), current role, and sign-up date, newest first.
- Roles shown as: **Founder (admin)**, **SHLM MOD**, **Free member (lifetime)**, **Member**.
- Each row has a role selector plus an "Apply" action. Choosing a new role opens a confirmation step naming the account and the exact change ("Change mike@… from SHLM MOD to Founder?"), and nothing is written until you confirm.
- After confirming, the row updates immediately and shows a short "Updated" note. The change takes effect for that person on their next page load / sign-in, exactly like today.
- Guard rails: you can't remove your own Founder role (prevents locking yourself out) — that row's selector is disabled with a short note.
- "Member" simply means no special role, so picking it clears any assigned role.

## Access

- Only the Founder passcode unlocks this section. SHLM MOD can never reach it: the SHLM MOD passcode is already rejected by the admin action gate, and `/admin` already shows "Not authorized" for that account.
- The section only renders once the console is unlocked, and sits below the applications list.

## Technical details

New server-only implementations in `src/lib/admin-actions.server.ts` (service-role client, same pattern as the existing application actions):
- `listAccountsImpl()` — `supabaseAdmin.auth.admin.listUsers()` (paged) joined with `user_roles` rows, returning `{ id, email, name, created_at, role }`.
- `setUserRoleImpl(userId, role)` — deletes existing `user_roles` rows for that user, then inserts the new role when it isn't `member`. Rejects a request that would strip the caller's own admin row is enforced client-side plus a server check that at least one admin remains.

New public endpoints reusing `runAdminAction` (Founder passcode only):
- `src/routes/api/public/admin.accounts.ts` (POST)
- `src/routes/api/public/admin.set-role.ts` (POST, validates `role` against `admin | shlm_mod | free_member | member`)

Client:
- `src/lib/admin-client.ts` — `fetchAccounts(passcode)` and `setUserRoleRequest(passcode, userId, role)` plus an `AdminAccount` type.
- `src/routes/admin.tsx` — new `ManageRoles` section component: `useQuery(["admin-accounts", passcode])`, per-row `<select>`, confirm dialog styled like the existing admin surfaces, invalidate on success.

No database migration is needed — `app_role` already has `admin`, `shlm_mod`, `free_member`, `user`, and `user_roles` policies already block client writes so all changes go through the service-role endpoint.

# Fix accidental role saves + add downgrade and revoke

## 1. The bug: a role saving without Apply or confirm

The code already requires Apply then a confirm dialog, so the save came from a tap passing through. On a phone, choosing an option in the native dropdown closes it and that same tap can land on the "Apply" button sitting right next to it, and the follow-up tap can land on "Confirm change" in the dialog that just appeared. The result is exactly what happened: a role change saved with no dialog seen.

Fixes:

- Move "Apply" onto its own line below the dropdown on small screens, away from where the dropdown option was tapped.
- Ignore any click on Apply or Confirm that arrives within a short moment of the dropdown closing or the dialog opening, so a stray carried-over tap can never trigger it.
- The confirm dialog now needs a deliberate second action: the Confirm button stays disabled until the dialog has been on screen briefly, and the dialog cannot be dismissed by tapping the backdrop.
- The dialog spells out the account, the old role and the new role, and stays the only path to saving.

## 2. Removing roles

**Downgrade to Member** — already in the dropdown as "Member"; it clears any Admin / SHLM MOD / Free member status. It will be relabelled "Member (no special role)" so it is obvious, and goes through the same confirm step.

**No access (revoked)** — a new dropdown option. Choosing it clears every role and blocks the account from signing in at all, so it loses the member area, Centre and journal. Their data stays untouched. Switching a revoked account back to any other role restores sign-in in the same action.

Each account row shows "No access" as its current state when revoked, so the list always reflects reality.

Safeguards kept: your own account row stays locked, and the last remaining Founder cannot be downgraded or revoked.

## Technical details

`src/lib/admin-actions.server.ts`
- `ManagedRole` gains `"revoked"`.
- `listAccountsImpl` reads `banned_until` from the admin user list; a banned account reports `role: "revoked"` regardless of role rows.
- `setUserRoleImpl`: keep the existing last-admin guard (extend it to cover `revoked`). Delete role rows, insert the new role when it is not `member`/`revoked`, then call `supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: role === "revoked" ? "876000h" : "none" })`.

`src/routes/api/public/admin.set-role.ts` — add `"revoked"` to the zod enum.

`src/lib/admin-client.ts` — add `"revoked"` to `ManagedRole`.

`src/routes/admin.tsx` — `ROLE_OPTIONS` gains "No access (revoked)"; row layout stacks the select and Apply on mobile; add tap-guard timestamps (`selectTouchedAt`, `pendingOpenedAt`) checked in the Apply and Confirm handlers plus a short disabled window on Confirm; no backdrop dismissal.

No database migration needed.

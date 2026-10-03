# Recruiter Portal

## What you'll get

**1. New "Recruiter" role.** It appears as a new option in the role dropdown you already use in the Founder admin panel (Manage roles). It goes through the same Apply step and confirmation as the other roles, so there's nothing new to learn. A recruiter gets everything a lifetime free member gets: full Centre, journal and member area, with no purchase needed.

**2. Recruiter Portal page (`/recruiters`).**
- **Founder:** sees every recruiter's row.
- **Recruiter:** sees only their own row and can't edit anything.
- **Everyone else:** sees no link to the page. Opening the address directly shows "Not authorized", and the server returns no data.
- A "Recruiter Portal" link shows up in the account menu (desktop and mobile) only for recruiters and the Founder.

Each row shows:
- Name (or email if no name is set)
- **Landed (lifetime)**, for example 37, with **Earned: $3,700** right next to it. The dollar amount is always calculated from the count (count × $100), so the two can never get out of sync.
- **This month: 23 landed**
- **Bonus tag** that appears at 20 in a month: "Bonus earned: $550". At 40 it shows $1,100, at 60 $1,650, and so on (one $550 per full 20). It stays hidden below 20.

**3. Updating the numbers (Founder only).** Each row has quick **−1** and **+1** buttons, plus a small "Add" box where you can type a number like 5. Each change updates the lifetime total and this month's count together and saves straight away. Use −1 to fix a mistake. Totals can't drop below 0.

## Monthly reset

I'd skip the scheduled job and store each "land" with the month it happened in.
- Lifetime total = every land ever recorded.
- This month = only lands recorded in the current calendar month (Pacific time).
- When a new month starts, "this month" and the bonus tag go back to 0 automatically. The lifetime total keeps growing.

Why this beats a scheduled reset:
- There's no timer that could fail.
- Nothing gets missed if a job doesn't run.
- Past months stay in the records, so I could add a history view later if you want one.

## Not touched

The Centre dashboard, payments, sign-in, the journal, and the existing roles all stay as they are. The only change to existing behavior: "recruiter" counts as lifetime access in the same places "free member" already does.

## Technical details

- Migration: `ALTER TYPE app_role ADD VALUE 'recruiter'`, plus a new `recruiter_lands` table (`id, recruiter_id uuid, delta int, month date` (first day of the month), `created_at`, `created_by`).
  - GRANTs, RLS on.
  - SELECT policy: own rows (`recruiter_id = auth.uid()`) or `has_role(admin)`.
  - No client write policies. All writes go through the server.
- Totals: lifetime = `sum(delta)`; month = `sum(delta) where month = current month (America/Los_Angeles)`. A server check stops any change that would take either total below 0.
- `src/lib/recruiters.functions.ts`, using `requireSupabaseAuth`:
  - `getRecruiterPortal`: admin gets every recruiter (from user_roles, names via the admin user list); a recruiter gets only themselves; anyone else gets an error.
  - `adjustRecruiterLands({recruiterId, delta})`: admin role verified through `has_role` before any write.
- Lifetime access: add `recruiter` next to `free_member` in `membership.functions.ts` and `hub.functions.ts`.
- Roles: add `recruiter` to `ManagedRole` (server and client), the set-role zod enum, the role rank map, and `ROLE_OPTIONS` in `admin.tsx`.
- New route `src/routes/recruiters.tsx` (client-side session check, same pattern as the Centre); menu link in `AccountMenu.tsx` gated by the role.
- Record the "lands ledger, no cron reset" rule in AGENTS.md.

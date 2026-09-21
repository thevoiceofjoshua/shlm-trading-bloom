# Multiple Tradovate accounts per member

Today each member can connect one Tradovate account. This lets them connect as many as they like (funded prop accounts, copy-traded accounts) and treats them as one combined book in the journal.

## What changes

1. **Dashboard Tradovate panel becomes a list**
   - Shows every connected account as its own row: label, live/demo, and when it was last used, with a Remove button per row.
   - "Add account" opens the same credential form as today; each account is saved as its own separate connection.
   - A member can give each connection a short label (for example "FTMO 50k", "Copy — Account 2"); if left blank we use the account name Tradovate reports.
   - Credentials are still sent straight to the server, encrypted with the existing key, and never sent back to the browser.

2. **Pulling fills covers every connected account**
   - "Pull from Tradovate" in a journal entry fetches the chosen window from all connected accounts and merges the results into one list, sorted by time.
   - Each imported trade row notes which account it came from, so a member can still tell them apart.
   - If one account fails (expired add-on, wrong credentials), the pull still returns the other accounts' trades and reports which account had a problem instead of failing entirely.
   - Empty results keep today's plain message; manual entry stays available.

3. **Totals stay combined**
   - The day's PnL, and the weekly and monthly totals, are the net sum across all trade rows in the entry — so one account up and another down shows the member's overall net, green or red. This is how the journal already sums trades, so no totals logic changes; it simply now includes rows from every account.

## What does not change

- The journal vault passcode, terminal styling, manual entry, roles, admin panel, pricing and checkout.
- Existing single connections keep working and appear as the first row in the new list — nobody has to reconnect.
- No new libraries, and nothing new runs while a page loads or renders, which is what caused the earlier outage.

## Technical notes

- Migration on `public.tradovate_connections`: drop the one-row-per-user unique constraint on `user_id`, add `label text`, add an index on `user_id`. Table stays server-only (RLS on, no anon/authenticated policies, `GRANT ALL` to `service_role`) exactly as now.
- `src/lib/tradovate.functions.ts`: `getTradovateStatus` → `listTradovateConnections` returning `{ id, label, environment, accountName, lastUsedAt }[]`; `connectTradovate` inserts a new row (no upsert on `user_id`) and accepts an optional `label`; `disconnectTradovate` takes a connection `id` scoped to `context.userId`; `importTradovateFills` loops the member's rows, renews each cached token independently, calls `fetchRoundTrips` per connection, tags each trade with its connection label, concatenates and sorts by entry time, and returns per-account warnings in `message`.
- `src/lib/tradovate.server.ts` is unchanged (same WebCrypto AES-GCM encryption, same REST calls, dynamic import inside handlers only).
- `src/components/TradovateConnect.tsx`: renders the connection list plus an "Add account" form; no credentials in component state after a successful save.
- `src/components/hub/Journal.tsx`: imported trade note gains the account label; trades map onto the existing `Trade[]` shape so day/week/month sums are untouched.
- Verification before publishing: typecheck, a clean build, and a check that the homepage and other public routes render server-side, plus the published site after deploy.

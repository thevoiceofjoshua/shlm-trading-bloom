# Session labels, entry-zone naming, and a 5:00 AM PST level refresh

Three changes to the SHLM Centre.

## 1. Session tiles without instrument names

The session tiles read "NY Open — NASDAQ / US30" and "Asia Session — XAU/USD". They become just "NY Open" and "Asia Session". The countdown / "Live now" state stays exactly as it is.

## 2. Swap the entry-zone labels

In the 5m execution block, the two pullback rows swap names:
- the row currently labelled "First entry zone" becomes "Deeper entry zone"
- the row currently labelled "Deeper entry zone" becomes "First entry zone"

Prices, distances and SWEPT/UNTAPPED badges are unchanged — only the labels move.

## 3. Levels refresh once a day at 5:00 AM PST, Monday–Friday

Today the 1H structure and 5m entry zones are recomputed every time the feed cache expires (about every 45 seconds), so the numbers can shift under you mid-session. Instead:

- Levels (1H bias/BOS-CHoCH/sequence, main target, invalidation, both entry zones) are computed once per trading day at the first refresh at or after 5:00 AM PST, Monday to Friday, and then held for the rest of that day.
- Live prices, day high/low and the change figures keep updating every 60 seconds as they do now.
- SWEPT / UNTAPPED keeps updating live — a level that gets run through during the day flips to SWEPT immediately, it just doesn't get replaced by a new level until the next 5:00 AM.
- On weekends and before 5:00 AM the most recent weekday's levels stay on screen.
- A small line on each card notes when the levels were set (e.g. "Levels set 5:00 AM PST").

## Technical notes

- New table `daily_levels` (instrument, session_date, payload jsonb, computed_at), RLS with a read-only `TO anon`/`authenticated` SELECT policy plus the standard GRANTs; only server code writes.
- `src/lib/quotes.server.ts`: keep the existing 1H/5m computation but move it behind a resolver that (a) derives the current "levels day" from LA time using a 5:00 AM cutoff and the Mon–Fri rule, (b) reads the stored row for that day and returns it, (c) computes and stores it only when no row exists yet. `swept` is recomputed on read from today's high/low rather than stored. Failures fall back to today's computed values, then to the sample dataset, as now.
- `src/lib/hub.functions.ts`: pass through the new `levelsSetAt` timestamp alongside `h1` / `pullbacks`.
- `src/components/hub/SessionBar.tsx` / `src/lib/market-data.ts`: shorten the two session labels.
- `src/components/hub/MarketBoards.tsx`: swap the two entry-zone role labels and render the "levels set" note; the Gold desk reuses the same block.
- No cron job needed — the first Centre view after 5:00 AM PST computes and stores that day's levels, and everyone else reads the same row.

## 4. Gold desk and drivers polished to match the index cards

The index cards carry the richer treatment (uppercase eyebrow, large tabular price, bias/BOS pills, badged levels), while the Gold desk and the two driver boards look plainer. Bring them up to the same finish, no new data:

- Gold desk: same header rhythm as an index card (eyebrow, name, change chip), same price scale, and the day high/low shown as the same labelled pill pair the index cards use instead of loose "H / L" text.
- Gold drivers: reuse the same macro tile component as the index boards, so gold gets the expandable "why" context and consistent arrows/spacing rather than a one-off tile.
- Driver tiles (NASDAQ / Dow 30): unify padding and type scale, align the strength bar and change figure on one row, give each tile a subtle hover lift and a consistent muted note line so the grid reads as an even set at every breakpoint.
- Section headers on both driver boards get the same eyebrow + divider treatment as the level blocks on the index cards.
- All styling stays on existing semantic tokens (card, surface, border, muted-foreground) — no new colors, black-and-white luxury look preserved, mobile two-column grid unchanged.

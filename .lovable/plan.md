# Win rate stat for the trading journal

Additive only — no changes to trade fields, entry flow, CSV import, or the Tradovate pull.

## What I found

- Each trade row already stores `result` ("win" | "loss" | "breakeven" | "") and a signed `pnl` string — no new field needed.
- The journal already has a week/month summary strip at the bottom (`WeekMonthSummary` + `SummaryTile`), fed by a server fetch of saved entries in a date range (`getMemberNotesRange`).

## Win rule (your pick)

A trade counts as a win when:

1. Its `result` mark is set → Win = win, Loss = loss, BE = breakeven.
2. If the mark is blank but the P&L has a number → P&L above 0 = win, below 0 = loss, exactly 0 = breakeven.
3. Rows with neither a mark nor a P&L are excluded entirely.

Win rate = wins ÷ (wins + losses) — breakevens are shown but don't count against you. Displayed like `64% · 9W / 4L / 2BE`.

## Scope selector (your pick)

The bottom summary becomes a small segmented selector — **This week / This month / All time** — above one summary card that shows for the chosen scope:

- Total P&L (colored, as today)
- Entries · trades
- Win rate line (as above)

Same existing design language (rounded card, uppercase labels, display font).

## Where the logic lives

- **Calculation:** client-side pure helper inside `src/components/hub/Journal.tsx` (next to the existing `pnlNumber` helpers). No server change, no database change — it reads the same saved entries the P&L totals already use.
- **All-time data:** one extra read of the same notes table using a very wide date range (separate query key), cached like the existing week/month fetch. Entries are all small JSON rows, so this stays light.
- **Display:** in `WeekMonthSummary` at the bottom of the journal (below the calendar and entry list, above the "How to import" panel). The two existing week/month tiles are replaced by the selector + card so there's one consistent place for the stats.

## Untouched

Trade editor, CSV Sync flow, Tradovate pull, vault gate, rules, calendar — all unchanged.

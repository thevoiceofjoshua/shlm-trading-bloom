# Full medium and high impact calendar from Forex Factory

The Centre calendar already pulls live from the Forex Factory weekly feed, so the source is correct. The gap is filtering: medium-impact releases are only kept when the currency is USD, so medium prints for EUR, GBP, CAD, NZD, CHF, AUD, and JPY are silently dropped. This week's feed carries 6 such medium releases that never reach the board.

## What changes

- Keep every medium and high impact release from the feed, regardless of currency. Low impact and non-economic rows (holidays, "All" country chatter) stay excluded.
- Show the currency next to each row in the collapsed list, not only inside the expanded panel, so a trader can scan which economy a print belongs to.
- Add a small filter row above the list: All / High only / USD only. Defaults to All.
- Widen the "what it moves" mapping so non-USD releases map to sensible instruments (for example EUR prints to EUR/USD and DAX-adjacent risk, GBP prints to GBP/USD) instead of always falling back to NASDAQ and US30.
- Update the footer caption and the empty-state copy to reflect medium plus high across all currencies.
- Apply identically for member, SHLM MOD, and admin views — the calendar renders from the same payload for all three, so no role-specific work is needed beyond confirming each still renders.

## Technical notes

- `src/lib/econ-calendar.server.ts`: drop the `row.country !== "USD"` guard on medium rows; extend `affectsFor` with currency-aware mapping (pass the row's country in alongside the title); keep the 10-minute cache, the empty-array fallback, and the LA wall-clock conversion unchanged.
- `src/components/hub/EconomicCalendar.tsx`: render the currency chip in the row header; add local `filter` state with the three options; adjust the caption and empty state.
- No database or schema changes; no new dependencies.

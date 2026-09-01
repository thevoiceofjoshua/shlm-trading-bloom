# Match the Forex Factory list row-for-row for USD

The Centre calendar already pulls live from the Forex Factory weekly feed, and today's ISM Manufacturing PMI (red), ISM Manufacturing Prices and JOLTS Job Openings (orange) are all on the board. The two rows that look missing — Final Manufacturing PMI and Construction Spending m/m — are tagged yellow (low impact) in the feed, and the current filter drops that tier entirely.

## What changes

- Every USD release comes through, at all three impact tiers: high, medium and low. Non-USD stays as it is today (high impact only), so the board keeps its US-desk focus.
- Low-impact rows render dimmed: muted text and a soft outlined LOW badge, so they read as background context and never compete with the red and orange prints.
- Impact badges get the Forex Factory tier language: solid badge for high, outlined for medium, faint for low.
- The "heads up" banner and the next-release line keep tracking high impact only, so extra low rows don't add noise.
- Footer caption updates to say the board mirrors the full USD list plus high-impact global releases, in local time.
- Identical for member, SHLM MOD and admin views — all three render from the same payload; each gets a visual pass after the change.

## Technical notes

- `src/lib/market-data.ts`: widen the `EconEvent` impact union to include `"low"`.
- `src/lib/econ-calendar.server.ts`: accept `low` alongside `high`/`medium`; keep the rule that non-USD only passes when high impact; skip the non-economic `All` country rows (for example G20 Meetings) so the list stays releases-only. Cache TTL, LA wall-clock conversion, and the sample-data fallback stay unchanged.
- `src/components/hub/EconomicCalendar.tsx`: three-tier badge styling, dimmed row treatment for low, high-impact-only banner and next-release logic, updated caption.
- No database or schema changes; no new dependencies.

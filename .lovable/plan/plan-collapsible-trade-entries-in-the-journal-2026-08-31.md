# Plan: Collapsible trade entries in the journal

## Goal
Make the multi-trade journal section easier to scan by letting the user collapse/expand the individual trade cards.

## What will change
- Update `src/components/hub/Journal.tsx` only.
- Add internal collapse state inside `TradesEditor`.
- Clicking the currently-selected trade-count number toggles the whole trades list between collapsed and expanded.
- Each trade card header (`Trade 1`, `Trade 2`, etc.) is also clickable to collapse/expand that single trade.
- When a trade is collapsed, show a compact summary line: instrument, direction, result, and PnL, with an expand chevron.
- Keep all existing behavior: adding/removing trades, PnL auto-summing, sign toggles, and save flow.

## UI/UX details
- Collapsed trades section still shows a row of compact summaries so the user can see what was logged at a glance.
- Expanded cards keep the existing form fields (instrument, direction/result, PnL, note).
- Smooth transitions are optional but will use a simple height/state toggle to keep it performant.
- Mobile and desktop share the same accordion pattern; no layout regressions.

## Verification
- Build passes after the edit.
- Open the journal from `/centre`, add an entry, select a trade count, confirm:
  - Tapping the selected number toggles collapse/expand of all trade cards.
  - Tapping an individual trade header collapses/expands just that card.
  - PnL still sums correctly when fields are edited after expand.
  - Saving persists trades as before.

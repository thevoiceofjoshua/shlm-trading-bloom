# Plan: Journal Entry Trade Count + Header Reorder

## Goal
1. Surface the number of trades taken inside each journal entry card.
2. Reorder the SHLM Centre header controls so the right-side group reads: Home → Open journal → First name.

## Current State
- `src/components/hub/Journal.tsx` renders day entries as clickable cards with session name, a "rule broken" flag, a note preview, and PnL. Each entry already stores `trades: Trade[]`.
- `src/routes/centre.tsx` currently renders the right-side header group as: Open journal button → `HomeButton` → first-name text.

## Changes

### 1. Entry card trade count
In `src/components/hub/Journal.tsx`:
- Add a small helper that produces a readable trade-count label from `entry.trades.length` (e.g. "1 trade" / "3 trades" / "No trades").
- Render that label as a compact, muted chip inside each entry card, beside or just under the session label, without breaking the existing layout on mobile.
- Keep using project tokens (`text-muted-foreground`, `border-border`) so the new element matches the luxury dark theme.

### 2. Header control order
In `src/routes/centre.tsx`:
- Reorder the right-side header group so the items appear as:
  1. `HomeButton`
  2. "Open journal" button
  3. First-name greeting
- Preserve existing responsive labels ("Journal" on small screens, "Open journal" on `sm`+).
- Remove the notebook emoji from the "Open journal" button in the same header group.

## Verification

- Run the build/typecheck and confirm no errors.
- In the preview, open the journal and confirm entries show the correct trade count and pluralization.
- Confirm the SHLM Centre header shows Home, then Open journal, then the first name in that order.

## Out of Scope
- No data-model or backend changes.
- No changes to the entry editor, rule flow, or modal behavior.

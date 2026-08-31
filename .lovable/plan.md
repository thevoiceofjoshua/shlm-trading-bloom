# Plan: Show Trade Count on Journal Entries

## Goal
Surface the number of trades taken inside each journal entry card so a member can scan the day at a glance.

## Current State
- `src/components/hub/Journal.tsx` renders day entries as clickable cards with session name, a "rule broken" flag, a note preview, and PnL.
- Each entry already stores `trades: Trade[]`; the length is the authoritative trade count.
- No other views render these entry cards, so the change is localized.

## Changes
1. **Entry card enhancement** in `src/components/hub/Journal.tsx`
   - Add a helper that returns a readable trade-count string (e.g. "1 trade" / "3 trades" / "No trades").
   - Display the trade count as a compact pill/chip beneath the session label, next to the existing rule-broken indicator, using the project's muted foreground and badge tokens.
   - Keep the card layout balanced on both desktop and mobile.

## Verification
- Run the build/typecheck and confirm no errors.
- Open the journal modal in the preview and verify existing entries show the correct trade count.

## Out of Scope
- No data-model or backend changes.
- No changes to the entry editor or rule flow.

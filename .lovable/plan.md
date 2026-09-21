# Clarify Tradovate live-connect account type

## What
Add a short clarifying line to the dashboard's Tradovate connection panel (Account settings) so members understand the live Connect flow is only for real Tradovate live cash accounts. Prop firm / evaluation / funded accounts (Apex, etc.) cannot connect live and should use the journal CSV import instead.

## How
1. In `src/components/TradovateConnect.tsx`, update the panel subtitle to include the requested copy:
   - "For live cash Tradovate accounts. Prop firm accounts (Apex, etc.) can't connect live — use CSV import in the journal instead."
2. Keep the existing connected-count message when accounts are already connected.
3. Run typecheck and build verification.
4. Publish when confirmed clean.

## Out of scope
- No functional changes to Tradovate connections, CSV import, or journal logic.
- No database or server changes.

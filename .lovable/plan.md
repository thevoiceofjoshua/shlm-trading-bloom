# Shorten SHLM Centre dashboard card subtitle

## Goal
Replace the long descriptive subtitle under the member dashboard's "SHLM Centre" card with a concise, punchy one-liner that still conveys the same value.

## Current text
> "Your live trading command center - NASDAQ & US30 watchlists, Mag 7 and Dow 30 drivers, a Gold desk, the US economic calendar, and an AI session analyst that flags the zero-volume and highest-volume opens each day."

## Proposed new text
> "Your live trading command center — watchlists, drivers, calendar, and AI session analyst."

Alternative options if you prefer a different tone:
- "Live market watchlists, drivers, calendar, and daily AI session analyst."
- "Your trading desk: watchlists, market drivers, calendar, and AI analyst."

## File to edit
- `src/routes/dashboard.tsx` — the `MarketHubTeaser` component's paragraph text.

## Non-goals
- No layout, route, auth, or data changes.
- No changes to the SHLM Centre page itself or other dashboard cards.
- Button label "Open SHLM Centre" stays the same.

## Verification
- `bunx tsgo --noEmit` typecheck.
- Build check.
- Visual confirmation that the card subtitle fits cleanly on desktop and mobile.

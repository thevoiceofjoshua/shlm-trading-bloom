# Simplify SHLM Centre heading subtext

## Goal
Trim the descriptive subtext beneath each SHLM Centre heading so it reads cleaner and more luxurious, while keeping the necessary information intact. Only the small caption lines under headings change — no layout, data, or behavior changes.

## Current subtexts to simplify

| Heading | Current subtext | New subtext |
|---|---|---|
| SHLM Analyst (h3) | "AI session review — reads every panel and flags the zero-volume (choppy) and high-volume (volatile) open calls." | "AI review with zero-volume and high-volume calls." |
| Dow 30 drivers — US30 (h3) | "What's moving US30: {payload.dowMovers.label}" | "{payload.dowMovers.label}" (drop the "What's moving US30:" prefix; the heading already says US30) |
| Economic calendar (h3) | "Next: {title} — {time} your time" | "Next: {title} — {time}" (drop "your time"; local conversion is implied) |
| SHLM Centre (h1) | "{DATA_LABEL}" e.g. "Sample data — live feed coming soon" | Keep as-is — this is the required data-source label, not decorative copy. |

Headings that currently have no caption subtext (Index cards, Mag 7 board, Gold desk, Trading notes journal date) stay unchanged — nothing to trim.

## Files to edit
- `src/components/hub/SessionAnalyst.tsx` — shorten the Analyst caption.
- `src/components/hub/MarketBoards.tsx` — drop the "What's moving US30:" prefix on the Dow board caption.
- `src/components/hub/EconomicCalendar.tsx` — drop "your time" from the next-event caption.

## Non-goals
- No changes to data sources, headings themselves, layout, session logic, or the viewer-local timezone conversion under the hood.
- No new sections or removal of information members rely on.

# Economic calendar: full data per release

Right now each calendar row only shows time, date, title, and an impact tag. The underlying data already has a one-line `detail` that is never displayed. This adds the real release data to every event and surfaces it in the panel.

## What changes for a member

Each row stays compact but becomes expandable. Tapping/clicking a release opens its data:

- Actual / Forecast / Previous figures side by side (Actual shown as "—" until release time passes)
- Currency / region tag (USD, etc.)
- Plain-English "what it is" line (from the existing detail text)
- "What it moves" — the instruments most affected (e.g. Gold, US30, US100, USD pairs)
- Session context — whether it lands before, inside, or after NY Open / Gold Session

The header still shows the next upcoming release and the high-impact heads-up banner. Times remain in the viewer's local timezone. The panel keeps the existing "Sample data — live feed coming soon" honesty label, since these figures are sample values until a market-data subscription is connected.

## Technical details

- `src/lib/market-data.ts`: extend `EconEvent` with `currency`, `forecast`, `previous`, `actual` (optional), and `affects: string[]`. Fill these for all seven sample events with realistic values matching each release.
- `src/components/hub/EconomicCalendar.tsx`: row becomes a button that toggles an expanded detail block; add a small three-column figures grid, affected-instruments chips, and the session-context line computed from the existing `hub-session` helpers. Mobile: figures stack two-up, chips wrap, tap targets at least 44px.
- No schema, server-function, or analyst changes; the analyst snapshot already receives `econEvents` and will pick up the new fields automatically.

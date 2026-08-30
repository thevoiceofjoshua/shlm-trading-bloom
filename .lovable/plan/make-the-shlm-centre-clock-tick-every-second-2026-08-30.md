# Make the SHLM Centre clock tick every second

## Change
In `src/components/hub/SessionBar.tsx`, change the `setInterval` interval from `30_000` (30s) to `1_000` (1s) so the displayed clock and session countdowns update once per second, ticking like a real clock.

One line changes:
- Line 8: `setInterval(() => setNow(new Date()), 30_000)` → `1_000`

No other files, layout, or data behavior changes. The clock already uses the viewer's local time via `now.toLocaleTimeString`; this only makes it update more frequently.

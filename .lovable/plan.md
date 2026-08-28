# Premium Members Hub

Turn the member dashboard into a trading command center built around your actual routine: NASDAQ + US30 in the morning, Gold from 5:00–7:15pm PST. Layout and structure ship now with clearly-labeled placeholder data; live market feeds get wired in once you pick a data provider.

## Access

Members-only. The hub is gated behind an active paid membership (already tracked by your purchase records). Signed-in users without an active membership see a locked preview with an "Apply to enroll" prompt instead of the hub contents. Admins always get access.

## Entry point

Inside the existing member dashboard, a new "Market Hub" section sits above the member modules grid: a wide featured panel showing the current session status and a live snapshot line (NASDAQ, US30, Gold), with an "Open Market Hub" action that takes the member into the full hub page. Nothing existing on the dashboard is removed or moved.

## What the hub shows

**1. Session command bar (top)**
- Live LA clock plus your three named windows: NY Open (NASDAQ/US30), Midday, and Gold Session (5:00–7:15pm PST).
- The active window is highlighted; the others show a countdown to open ("Gold session opens in 4h 12m").
- Weekend/holiday state: "Markets closed — next session Monday 6:30am PST."

**2. Index watchlist — NASDAQ (US100) + DOW (US30)**
- Two large cards: price, change, % change, day range, and a session bias tag.
- Each card lists its key levels (prior day high/low, premarket high/low) as fields you can maintain.

**3. Mag 7 board**
- AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA in a compact grid: price, % change, and a color-coded strength bar.
- A "Mag 7 breadth" summary line (e.g. "5 of 7 green — index tailwind") since these names drive NASDAQ direction.

**4. Gold desk**
- XAU/USD price card sized for your evening session, with your session window highlighted.
- Gold driver strip: DXY, US 10-year yield, and real yields — each with direction arrows and a one-line "what this means for gold" note.

**5. Economic calendar**
- Today + this week's US high-impact releases: CPI, PPI, NFP, jobless claims, FOMC/Fed speakers, GDP, PCE, retail sales, ISM.
- All times converted to LA time, with impact badges (high/medium) and a countdown on the next release.
- A "heads up" banner when a high-impact release lands inside one of your trading windows.

**6. Trading notes / bias journal**
- A per-day note field where a member logs their bias and plan for each session, saved to their account.

## Data approach

Every data panel is fed through one typed module with a clearly marked static/sample dataset (economic calendar entries, quotes, levels). When you pick a provider, only that module gets swapped — no UI rework. Panels visibly label data as sample until then, so nothing is passed off as live.

## Design

Same black-and-white luxury language as the rest of the site — Space Grotesk headings, DM Sans body, bento grid, pill controls, thin borders, generous whitespace. Green/red only as accents for direction. Mobile: stacked cards, horizontally scrollable Mag 7 row, sticky session bar; desktop: multi-column bento.

## Technical notes

- New route `src/routes/dashboard.hub.tsx` (linked from the dashboard) plus extracted components under `src/components/hub/`: `SessionBar`, `IndexCard`, `MagSevenBoard`, `GoldDesk`, `EconomicCalendar`, `BiasJournal`.
- Session windows and all time math derive from `SITE_TIMEZONE` in `src/lib/time.ts` — no new timezone constants.
- `src/lib/market-data.ts` holds typed sample quotes/calendar plus session-window helpers (pure, no I/O at module scope).
- Membership gating reuses `getMyMembership` from `src/lib/membership.functions.ts`; a new `hub.functions.ts` server fn (with `requireSupabaseAuth`) returns access state plus hub payload so the gate is enforced server-side, not just in the UI.
- Bias journal: new `public.member_notes` table (user_id, note_date, session, body) with GRANTs and owner-scoped RLS on `auth.uid()`, read/written through an authenticated server function.
- Existing dashboard membership/extension panels stay exactly as they are.

## Next step after this

Pick a market data provider (Finnhub, Twelve Data, or Polygon all cover indexes, Mag 7 equities, and gold). Once you add the key, the sample module is replaced with cached server-side fetches on a short refresh interval.

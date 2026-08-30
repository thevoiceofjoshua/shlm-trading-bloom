# Plan — Fill the NASDAQ Drivers board

## Problem
On `/centre`, the **Mag 7 — NASDAQ drivers** card sits in a two-column grid next to the **Dow 30 drivers — US30** card. The grid stretches both cards to equal height (≈555px). The Dow card fills its height with 10 per-stock driver notes **plus** a 3-tile "Macro drivers" section. The Mag 7 card only shows 7 compact tiles (symbol, price, % change, strength bar) and no notes or macro section, so the lower portion of the card is empty.

## Goal
Make the NASDAQ Drivers board fill its space the same way the Dow board does — matching its richness and height — without changing the Dow board, the grid layout, or any data source.

## Changes

### 1. `src/lib/market-data.ts` — add NASDAQ driver detail
- Add a `note` field to each `MAG_SEVEN` entry (plain-English cause-and-effect line, same style as `DOW_DRIVERS` notes), e.g.:
  - AAPL → "Lifting the index with steady demand."
  - NVDA → "The biggest weight on the index today."
  - etc. (one line per stock, reflecting its `changePct` sign)
- Add a new `NASDAQ_MACRO: MacroDriver[]` array (3 tiles, reusing the `MacroDriver` interface) with NASDAQ-relevant macro context:
  1. **10-Year Yield** — rising yields pressure growth/tech names (reuse DOW_MACRO yield concept, tech-specific read).
  2. **Semis / AI cycle** — directional read on chip demand lifting NVDA/AVGO-style names (sample value like "Strong").
  3. **USD (DXY)** — a stronger dollar can weigh on multinational tech exporters.
  Each tile includes `label`, `value`, `direction`, `read`, and a tap-to-expand `context` string — identical shape to DOW_MACRO / GOLD_DRIVERS.
- Export a `nasdaqMovers()` helper (mirrors `dowMovers()`) that returns the top-mover symbol + a label like "NVIDIA is driving the index lower".

### 2. `src/lib/hub.functions.ts` — expose new fields in `HubPayload`
- Add to the `HubPayload` interface: `nasdaqMacro: typeof NASDAQ_MACRO` and `nasdaqMovers: ReturnType<typeof nasdaqMovers>`.
- Populate both in the `getHubData` handler payload and in the `runSessionReview` snapshot so the analyst sees the same data.
- Import `NASDAQ_MACRO` and `nasdaqMovers` from `market-data`.

### 3. `src/components/hub/MarketBoards.tsx` — enrich `MagSevenBoard`
- Rename the heading from "Mag 7 — NASDAQ drivers" to **"NASDAQ drivers — US100"** so it parallels "Dow 30 drivers — US30".
- Show the `nasdaqMovers().label` in the header subtext (replacing the breadth label), matching the Dow board's mover label.
- Add each Mag 7 stock's `note` under its strength bar (same `text-[11px] leading-snug text-muted-foreground` style as Dow driver notes).
- Add a "Macro drivers" section below the stock grid (mirroring the Dow board): a `sm:grid-cols-3` grid of 3 `MacroTile` components driven by `payload.nasdaqMacro`, with the same tap-to-expand behavior. The existing `MacroTile` component is reused unchanged.

No other panels, layout, session logic, data-source labeling, or auth gating change.

## Verification
- `tsgo --noEmit` passes.
- Build passes.
- Preview `/centre`: the NASDAQ drivers card fills its height (no empty gap), matches the Dow card visually, per-stock notes and 3 macro tiles render, and tap-to-expand works on both mobile and desktop widths.

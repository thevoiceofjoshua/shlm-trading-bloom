# Market Internals module for the SHLM Centre

Adds one new, separate section. Nothing existing is edited except two insertion lines (one extra field passed through the Centre's data, one component placed on the page).

## Current architecture (what I found)

| Piece | Where it lives |
|---|---|
| Market data retrieval | `src/lib/quotes.server.ts` — `fetchDelayedQuotes()` pulls Yahoo Finance chart data server-side, 45s cache (`TTL_MS`) |
| Direction / Structure calc | `src/lib/quotes.server.ts` — swing/BOS reads + `combineMtf()` on NQ/YM/GC futures 15M and 5M candles, stored on `quote.mtf` |
| Driver tilt applied to Direction | `src/lib/hub.functions.ts` — `withTilt()` inside `getHubData` |
| Drivers data | `src/lib/market-data.ts` (MAG_SEVEN, NASDAQ_MACRO, DOW_DRIVERS, DOW_MACRO, GOLD_DRIVERS) + live merge in `hub.functions.ts` |
| Symbol-specific logic | `YAHOO_SYMBOLS` map and structure symbol map in `quotes.server.ts`; per-board rendering in `MarketBoards.tsx` |
| UI | `src/components/hub/MarketBoards.tsx` — `IndexCards` (DirectionBlock + Structure pills), `MagSevenBoard`, `DowBoard`, `GoldDesk`, `DriverScore`; page order in `src/routes/centre.tsx` |

Note: there is currently no ATR calculation or Momentum Score in the Centre (only VIX/ATR text inside the beta indicator description). The module will not create one; the "Momentum" layer is left for a future step.

## The data problem (needs your decision)

I tested the Centre's current feed: **$TICK, $ADD and $VOLD are not available from it** (all return "not found"). Only **VIX** is available. These are NYSE exchange internals and are only sold through paid market-data providers. Per your rule 7, I will not estimate them. Options:

1. **Build now, internals show DATA UNAVAILABLE** — VIX works live; $TICK/$ADD/$VOLD each show "DATA UNAVAILABLE — no NYSE internals source connected", and the scores show DATA UNAVAILABLE. The logic is complete and switches on the moment a source is plugged in.
2. **Connect a paid provider** that publishes NYSE internals (e.g. a market-data API with index/internals coverage). You'd supply an API key; I'd verify it actually returns TICK/ADD/VOLD before wiring it.
3. **Labelled substitute** — e.g. breadth computed from advancers/decliners across the Dow 30 and Mag 7 already in the feed, clearly labelled "SUBSTITUTE: Dow 30 + Mag 7 breadth, not NYSE $ADD". No substitute exists for $TICK.

My recommendation: option 1 now, option 2 when you have a provider.

## How it will be calculated

New server-only file `src/lib/internals.server.ts` (pure functions + fetch, runs only inside the existing hub request — nothing at page load/render):

- **Smoothing (rule 8):** each internal is read on 5-minute bars; $TICK uses the average of the last 6 five-minute readings (~30 min) plus the latest, so one spike cannot flip the status. $ADD/$VOLD use level plus slope over the last 3 bars.
- **Classification:** each input → bullish / neutral-mixed / bearish, with separate thresholds for NASDAQ and Dow (Dow gets wider neutral bands, $VOLD weighted slightly higher for Dow; $TICK prioritised first for NASDAQ per your order).
- **Participation score:** compares internals to the *existing* Direction read (read-only). Weighted by priority ($TICK > $ADD > $VOLD). Aligned → CONFIRMING; partial → MIXED; opposite → DIVERGING.
- **VIX:** context only — rising VIX during a bearish read = "risk-off confirms", rising VIX during a bullish read = "caution, fear rising into strength"; never scored as bull/bear alone.
- **Divergence:** bullish Direction + bearish internals → BEARISH INTERNAL DIVERGENCE; bearish Direction + bullish internals → BULLISH INTERNAL DIVERGENCE. Labelled as warning context, not a signal.
- **Breakout confirmation:** uses the existing 5M structure + BOS (read-only). Structure and BOS agree + internals CONFIRMING → CONFIRMED; MIXED → CAUTION; BOS present but internals DIVERGING → BREAKOUT NOT CONFIRMED. No BOS → "No active breakout".

## Display

A new `MarketInternals` card placed directly below the NASDAQ/Dow index cards (so the page reads Drivers context → Direction → Market Internals), existing black-and-white style and pills:

```text
MARKET INTERNALS                      NASDAQ | US30
$TICK  [Bullish pressure]   $ADD [Neutral-mixed breadth]
$VOLD  [Bullish volume]     VIX  18.4 ▼  context line
INTERNAL PARTICIPATION:  CONFIRMING
BREAKOUT CONFIRMATION:   CONFIRMED
note line (divergence / missing-data explanation)
```

Gold is excluded (internals are an equity-market measure).

## Technical notes

- New: `src/lib/internals.server.ts`, `src/components/hub/MarketInternals.tsx`.
- `src/lib/hub.functions.ts`: add one optional `internals` field to the payload, computed after existing quotes, inside its own try/catch so a failure can't affect other sections.
- `src/routes/centre.tsx`: one line placing `<MarketInternals />` after `<IndexCards />`.
- No database change, no new library. Same view for member, SHLM MOD and admin.
- Verification: typecheck, build, load the Centre signed in, confirm Drivers/Direction/Structure values are unchanged before vs after, and confirm the public pages load.

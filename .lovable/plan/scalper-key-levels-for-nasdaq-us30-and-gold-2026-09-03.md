# Scalper key levels for NASDAQ, US30 and Gold

Replace the current "Key Levels" block (Yesterday High/Low, Pre-Market High/Low — which is showing "No data" for pre-market) with levels built around how you actually trade: direction from the 1H, pullbacks on the 5m, and highs/lows tagged as still-untapped liquidity.

## What each board will show

**1H Structure — direction and main target**
- 1H bias: Bullish / Bearish / Ranging, from the most recent 1H swing sequence.
- Main target: the nearest opposing 1H swing high (if bullish) or low (if bearish), i.e. the draw on liquidity.
- Protective level: the 1H swing on the other side that would invalidate the bias.
- Each number tagged SWEPT or UNTAPPED depending on whether price has already traded through it during the current session.

**5m Pullback Zones — entries on the way to the target**
- The two most recent 5m swing points sitting between current price and the 1H target, labelled as pullback levels with distance from price (points and %).
- Each also tagged SWEPT / UNTAPPED so a level already run through is visually retired.
- Short caption: highs/lows are liquidity; price tends to pull back into these on the way to the 1H target.

Gold gets the same two blocks on the Gold desk card.

## Visual treatment
- Same card style, black-and-white luxury: two labelled sub-blocks with a divider.
- UNTAPPED = solid emerald (highs) / red (lows) badge; SWEPT = dimmed, struck-through-feel muted badge.
- Bias shown as a small pill next to the heading (↑ / ↓ / →).
- Mobile: single column stack; desktop: two columns as today.

## Technical notes
- `src/lib/quotes.server.ts`: add 1H bar fetching (`interval=60m&range=1mo`) and 5m bars (`interval=5m&range=5d`, already partly fetched) for NASDAQ, US30, XAU/USD. Add a small pure swing-detection helper (fractal high/low over a configurable lookback) and compute: `h1Bias`, `h1Target`, `h1Invalidation`, `m5Pullbacks[]`, each with a `swept` boolean derived from today's high/low vs the level.
- Extend `DelayedQuote` with these fields; keep everything optional and inside try/catch so a feed failure degrades to the existing sample values rather than breaking the Centre.
- `src/lib/hub.functions.ts`: widen the index and gold payload types and pass the new fields through the existing quote-merge map.
- `src/components/hub/MarketBoards.tsx`: replace the `KeyLevel` grid with a `StructureBlock` (1H) and `PullbackBlock` (5m); reuse in `GoldDesk`. Levels with no data render "—" as they do now.
- Existing 45s server cache and 60s client polling keep it fresh; no extra requests per viewer.

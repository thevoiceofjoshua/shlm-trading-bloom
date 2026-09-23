# Multi-timeframe Direction & Structure (15M + 5M)

Replaces only the "1H Structure — direction" block on the three instrument cards (NASDAQ, Dow/US30, Gold) with a 15M-context / 5M-primary read. Drivers, macro strips, entry-zone levels, prices, layout and styling stay exactly as they are.

## Where the 15M and 5M data comes from

Same feed already powering the Centre (Yahoo Finance chart endpoint, server-side, cached 45s):

- 15M bars: `interval=15m&range=1mo` — roughly 4 weeks of 15-minute candles.
- 5M bars: `interval=5m&range=5d` with pre/post included — the longest 5-minute history the feed serves.

Both requests return open/high/low/close per candle. The current code only keeps high/low; it will now also keep **close**, because a Break of Structure must be confirmed on a candle close.

One decision for you: the cards currently read the cash indices (NASDAQ 100 index, Dow index) and spot gold, which only have intraday candles during regular US hours. You named the futures (MNQ1!, MYM1!, MGC1!), which trade nearly 24 hours and would give continuous 15M/5M structure including the Asia session. I plan to keep the displayed prices exactly as they are now, and compute the structure from the futures continuous contracts (NQ, YM, GC) so the 15M/5M read is never blank outside US hours. Tell me if you'd rather the structure also come from the cash index.

## How direction and structure are calculated

Per timeframe (15M, then 5M), on server-side pure functions:

1. Find swing highs and swing lows (a candle whose high/low dominates its neighbours on both sides).
2. Read the last two swing highs and last two swing lows:
   - Higher High + Higher Low → bullish
   - Lower High + Lower Low → bearish
   - anything mixed → neutral (no direction is forced)
3. Break of Structure: the most recent candle **close** beyond the last established swing high (bullish BOS) or swing low (bearish BOS). A wick through a level with the close back inside is ignored — it is recorded as a sweep, not a break.
4. Trending vs consolidating: measured from how much of the recent range price has actually travelled (directional progress against total range). Low progress inside a tight band → Consolidating.

Alignment then combines the two timeframes:

- 15M bullish + 5M bullish → 🟢 ALIGNED BULLISH
- 15M bearish + 5M bearish → 🔴 ALIGNED BEARISH
- the two disagree → 🟡 MIXED/CONFLICTED
- both neutral or unclear → ⚪ NEUTRAL

Direction is the headline call, derived from 5M as primary, checked against 15M, the most recent confirmed BOS, whether price is trending or consolidating, and the read-only driver context already on the page (the existing macro/driver tilt for that instrument — nothing about drivers changes, it is only read):

- 🟢 BULLISH — 5M clearly bullish with 15M and driver context supportive
- 🔴 BEARISH — 5M clearly bearish with 15M and driver context supportive
- 🟡 NEUTRAL — structure unclear, ranging, or not enough confirmation
- ⚠️ CONFLICTED — the timeframes materially disagree, or structure and driver context strongly oppose

No BUY/SELL entries, no indicator, momentum, ATR or volume logic is created or touched.

## Display

On each of the three cards, in the exact slot the current 1H block occupies, same card size and type scale:

```text
DIRECTION:  🟢 BULLISH
STRUCTURE:  15M: Bullish · 5M: Bullish · BOS: Bullish · State: Trending · Alignment: Strong
```

The structure line wraps naturally on a phone. When the feed can't produce enough candles the line reads `—` for the missing parts, as the current block already does for missing levels.

The 5M entry-zone block below it, the daily 5:00 AM PST level lock, the "Levels set …" stamp, the drivers, the macro strip, the calendar and the journal are untouched. One behavioural note: because 5M structure changes during the session, Direction/Structure refreshes on the existing 60-second poll rather than being frozen at 5:00 AM like the entry levels.

## Technical notes

- `src/lib/quotes.server.ts`: extend `Bar` with `close`; add a `structureRead(bars)` helper returning `{ bias, sequence, bos, state }`; fetch 15M and 5M series for the three detailed instruments; add an optional `mtf?: { m15, m5, bos, state, alignment, direction }` field to `DelayedQuote`. All inside the existing try/catch so a feed failure degrades to no read instead of breaking the Centre. The existing `structureFrom` (1H) stays only if still needed for the entry-zone target; otherwise it is retired with the block.
- `src/lib/hub.functions.ts`: widen the index and gold payload types and pass `mtf` through the existing quote-merge map. Driver-context tilt is read from the already-computed driver arrays; no new requests, no driver changes.
- `src/components/hub/MarketBoards.tsx`: replace the `ScalperLevels` 1H sub-block with a `DirectionBlock` rendering the two lines above; `GoldDesk` picks it up automatically since it reuses the same component.
- No database migration, no new dependency, no new network calls per viewer beyond the two extra cached chart requests per instrument.

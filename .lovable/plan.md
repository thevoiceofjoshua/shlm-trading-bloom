# SHLM Centre — Premium Dashboard Refinement

## Phase 1 — Audit findings

**What the Centre has today, top to bottom:**
1. Header with Member tools menu (Journal, Weekly Behavior, Beta VIP), feed badges, "Weekly Behavior →" button.
2. Session bar: live clock, NY Open and Gold session tiles with countdowns, markets-closed note.
3. NASDAQ and US30 index cards: price, change, day high/low pills, and a Direction / Structure block (15M, 5M, break of structure, Trending/Consolidating, Alignment).
4. NASDAQ drivers (Mag 7 tiles + macro tiles + plain-English macro summary + Driver score).
5. Dow 30 drivers (heaviest Dow names + macro tiles + summary + Driver score).
6. Gold desk (price, range, gold drivers DXY / yields, summary, Driver score).
7. Morning high-impact news spotlight, "At the open" impact cards, and the full Economic calendar.
8. Notification banner (top) and Notification Center (bottom).
9. Separate Weekly Behavior page (Mon/Fri live read, Tue–Thu fixed text + rare caution note).
10. Market Internals: built, hidden until a real data source exists.

**Data sources:** one free delayed market feed (about 10–20 minutes behind) for all prices and 5-minute bars; a live economic calendar feed; 2-year Treasury futures as the 2-year yield stand-in. Daily key levels are calculated once each morning at 5:00 AM Pacific and saved so they don't move during the day.

**How your five named features map to what exists:**

| Your name | What exists | Status |
|---|---|---|
| 1. Daily Market Map | No section with this name. The site already **calculates** prior-day high/low, premarket high/low, 15M target / invalidation, and 5M pullback levels every morning, but **none of these are shown on screen** — only today's high/low pills. Asia and London highs/lows are calculated only inside the Weekly Behavior reader (NASDAQ only). | Partly built behind the scenes, not visible |
| 2. Market Drivers | NASDAQ drivers, Dow drivers, Gold drivers, each with a Driver score. | Exists |
| 3. Liquidity Radar | No section with this name. The saved levels above (with "swept" marking) are the natural source. | Not visible |
| 4. Mon/Fri Character | Weekly Behavior page: FAST / CHOPPY / SLOW / RANGE BOUND with reasons and 8 scored checks. | Exists (labels differ from your spec — see decisions) |
| 5. News Filter | Morning spotlight + "At the open" cards + full calendar, with time, impact and session timing. | Exists; no "relevant markets" column |

**New features A–E and the Brief:**
- A. Volatility meter — missing (pieces exist: overnight range and candle size checks inside Weekly Behavior).
- B. Market State — partly exists (Trending/Consolidating and Conflicted per index). Expanding / Contracting / Liquidity Sweep are missing.
- C. NY Opening Range — missing.
- D. Symbol comparison — missing (all inputs exist).
- E. Trade Readiness checklist — missing.
- Market Brief — missing.

## Phases 2–10 — What I'll build

**Order on the Centre page (new layout):**
```text
Notification banner
SHLM MARKET BRIEF                  (new, summary only)
Session bar                        (unchanged)
Market context: Market Map + Liquidity Radar  |  Drivers (tabs: NASDAQ / Dow / Gold)
Market conditions: Market State · Volatility · Mon/Fri Character (compact link to the full page)
News: morning spotlight + calendar (unchanged content, "Markets" column added)
Session: NY Opening Range
Comparison: US30 / NASDAQ / Gold
Pre-trade: Trade Readiness checklist
Notification Center
```

**Improvements to the existing five:**
1. **Market Map** — inside each index card and the Gold desk, show the levels the site already calculates: Asia, London, prior day, premarket, current price, and structure. Nothing is calculated twice.
2. **Drivers** — the three driver boards become one section with NASDAQ / Dow / Gold tabs, so only one board shows at a time. Each driver gets a Bullish / Bearish / Neutral / Conflicting tag with a short reason. The 2-year yield gets a reason line too (for example "Breaking above London range"). Same data, same scores.
3. **Liquidity Radar** — a compact list of the same saved levels, split into above price and below price, sorted by distance and labeled "Near" or "Far". Swept levels are greyed out. Plain wording only, never "will reach."
4. **Mon/Fri Character** — a small card on the Centre showing today's read, its reason, and its top 3 checks, linking to the full page. Tue–Thu stays as is.
5. **News** — add a "Markets" column (NASDAQ / US30 / Gold) using a simple fixed rule by release type. Content and calendar stay the same.

**New pieces:**
- **A. Volatility (5M)** — LOW / MEDIUM / HIGH / EXTREME from recent 5-minute candle size compared with the 5-day average, one value per instrument.
- **B. Market State** — TRENDING / RANGING / EXPANDING / CONTRACTING / LIQUIDITY SWEEP / CONFLICTED, built from the existing structure read plus Volatility plus the London sweep detector.
- **C. NY Opening Range** — the first 15 minutes after 6:30 AM Pacific: high, low, size, and whether price is inside, above, or below. Before 6:45 it shows "Forming".
- **D. Comparison** — three short columns, each showing Structure, Volatility, Drivers, Liquidity and State as one-word answers. No ranking and no "pick this."
- **E. Trade Readiness** — 8 tick boxes, saved per member per day. No verdict, only "x of 8 complete".
- **Market Brief** — 6–8 lines taken only from the sections above, plus one fixed neutral "What to watch" sentence built from those values. No AI wording and no predictions.

**Mobile:** the Brief comes first, then Market State, Liquidity, Drivers, Volatility and News. Comparison, Opening Range, Readiness and the full calendar collapse into tap-to-open sections.

**Look:** same black-and-white design. Green, red and yellow are used only for states. Spacing and headings are tightened.

**Data honesty:** anything missing shows "DATA UNAVAILABLE". The Brief and Opening Range say "Delayed ~15 min" because the feed is delayed. Calculated-history items (5-day averages) are labeled as such.

**Not touched:** sign-in, membership, payments, journal, Tradovate, landing page, Weekly Behavior logic, notifications, hidden Market Internals.

## Decisions needed

1. **Mon/Fri labels.** Your spec says Fast / Slow / Mixed. The live system uses FAST / CHOPPY / SLOW / RANGE BOUND, which you approved earlier. I plan to keep the current four. Tell me if you want them collapsed to three.
2. **Delayed data.** The Opening Range and Volatility will be about 15 minutes behind real time, since the feed is free and delayed. Acceptable, with a clear "Delayed" label?
3. **Gold levels.** Asia and London levels currently exist only for NASDAQ. I plan to calculate them for US30 and Gold the same way. Alternatively, they could show "DATA UNAVAILABLE" for those two.
4. **Trade Readiness storage.** Saving the ticks per member needs one small new private table. The alternative is keeping them on the device only.

## Technical details

- New server-only helper `src/lib/market-context.server.ts` reuses `getJson` 5m bars, `failedBreaks`/`detectSweep` session windows from `weekly-behavior.server.ts` (exported, not copied) and existing `mtf` reads; returns per-instrument `{ sessionLevels, volatility, state, openingRange }`, added to `HubPayload` as `context`.
- Brief and Comparison are pure client functions over `HubPayload` — no new fetches.
- New components under `src/components/hub/`: `MarketBrief`, `LiquidityRadar`, `MarketConditions`, `OpeningRange`, `SymbolCompare`, `TradeReadiness`; `MarketBoards.tsx` gains a level strip + driver tabs wrapper only.
- Readiness table (if approved): `member_readiness(user_id, ready_date, checks jsonb)` with GRANTs + owner-only RLS.
- Role parity: same view for member, SHLM MOD (read-only, readiness saves disabled), and admin.

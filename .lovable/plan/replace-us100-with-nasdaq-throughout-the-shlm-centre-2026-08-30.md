# Replace "US100" with "NASDAQ" throughout the SHLM Centre

## Goal
Stop using the ticker shorthand "US100." Everywhere it currently appears, show the plain label "NASDAQ" instead. No behavior, layout, or data changes — a pure label swap.

## Files to change

### 1. `src/lib/market-data.ts`
- Line 35 — session pairs list: `"NASDAQ (US100)"` → `"NASDAQ"`
- Line 75 — index symbol: `symbol: "US100"` → `symbol: "NASDAQ"`
- Lines 270, 281, 292, 303, 314, 325, 336 — economic-calendar `affects` arrays: every `"US100"` entry → `"NASDAQ"`

### 2. `src/components/hub/MarketBoards.tsx`
- Line 75 — board heading: `"NASDAQ drivers — US100"` → `"NASDAQ drivers"`

## Notes
- "US30" (Dow) is left untouched per the request, which names only US100.
- The index `symbol` field is display-only (rendered in `IndexCards`), so changing it from "US100" to "NASDAQ" updates the small uppercase label on the index card with no downstream effect.

## Verification
- Build/typecheck passes.
- Reload `/centre`; the index card shows "NASDAQ" and the drivers board reads "NASDAQ drivers."

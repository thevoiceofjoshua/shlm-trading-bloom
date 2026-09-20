# Tighten SHLM Centre explanatory copy

## Goal
Trim long-winded explanatory text on the SHLM Centre page so the market data stands out, while preserving all data, numbers, labels, and functionality.

## Changes

### 1. Repeated 1H / 5m paragraph (NASDAQ, US30, Gold)
**File:** `src/components/hub/MarketBoards.tsx`

Current text under each instrument:
> "Direction and target come off the 1H (BOS continues it, CHoCH flips it). Execute on the 5m: wait for the pullback into these untapped highs/lows, then run with the 1H draw."

Replace with a single concise line that keeps the same meaning, e.g.:
> "Trade with the 1H direction; enter on the 5m pullback into untapped levels."

### 2. Economic Calendar heads-up banner
**File:** `src/components/hub/EconomicCalendar.tsx`

Current:
> "⚠ Heads up: a high-impact release lands today — check if it falls inside your trading window."

Shorten to a more direct warning, e.g.:
> "⚠ High-impact release today — watch your session timing."

### 3. Economic Calendar footer source label
**File:** `src/components/hub/EconomicCalendar.tsx`

Current:
> "Live calendar — every USD release plus high-impact global prints, in your local time."
> "Sample data — live feed unavailable right now."

Shorten to:
> "Live calendar — USD + high-impact global releases, local time."
> "Sample data — live feed unavailable."

### 4. Session context strings
**Files:** `src/components/hub/EconomicCalendar.tsx` (`sessionContext` helper) and source in `src/lib/market-data.ts` if present.

Tighten verbose helper output while keeping the time/session relationship clear, e.g.:
- "Lands inside London" → "Inside London session"
- "Lands 45 min before New York" → "45 min before New York"
- "Outside the SHLM trading windows" → "Outside trading windows"

### 5. General pass for other wordy blocks
**Files:** `src/components/hub/MarketBoards.tsx`, `src/components/hub/EconomicCalendar.tsx`, `src/components/hub/SessionBar.tsx`, `src/routes/centre.tsx`.

Scan for remaining explanatory paragraphs, helper tooltips, banner copy, or status messages that are more than one short line. Condense them where the same meaning can be conveyed in fewer words. Leave data values, section titles, button labels, and the journal alone.

## Not changing
- Any numbers, prices, percentages, dates, times, or labels.
- The journal, vault gate, auth flow, admin features, or any server logic.
- Section headings like "1H structure — direction" and "5m execution — pullback entries".
- The `nextNote` in `SessionBar` is generated server-side; only the client-facing helper strings above will be edited.

## Verification
- Run `bunx tsgo --noEmit` for type safety.
- Check the build output.
- Confirm the repeated paragraph is now a one-liner under all three instruments.

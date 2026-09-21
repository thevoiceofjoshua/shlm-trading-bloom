# CSV import for journal trades

Adds a second way to auto-fill trade rows: upload a Tradovate Orders CSV export. Works for prop firm accounts (Apex etc.) that can't use the live API, and needs no Tradovate connection at all.

## What the member sees

- In the journal entry, next to "Pull from Tradovate", a new **"Import CSV"** button. It shows for everyone, whether or not they have a live Tradovate connection — if they have none, the current "connect Tradovate to auto-fill" hint is replaced by the CSV button plus a short line explaining it's for prop firm accounts.
- Tapping it opens a small panel with an optional **account label** field (e.g. "Apex 50K #2") and a file picker for the CSV.
- After picking the file, filled orders are paired into round-trip trades and **added to the trade rows already there** — so a member can import several accounts' CSVs one after another, and mix in manually typed trades. Nothing is replaced and nothing saves automatically; everything stays editable.
- Each imported row's note carries the account label, size, entry → exit price and fill time, matching how live-pulled rows look today.
- A short confirmation says how many trades were read, and mentions any orders it had to skip (unfilled, cancelled, or left open with no closing order).
- Day, weekly and monthly totals come from the saved trade rows, so CSV, live-pulled and hand-typed trades all add up together with no extra work.

## Error handling

Parsing happens in the browser with a small hand-written reader — no new libraries, nothing added to page load or server rendering. Every failure ends in a plain message inside the panel, never a crash:

- Not a CSV / empty file → "That file doesn't look like a Tradovate orders export."
- Missing the columns we need → names the columns it couldn't find.
- No filled orders in the file → says so and suggests exporting from the Orders tab with fills included.
- Rows with unreadable numbers or dates are skipped and counted in the confirmation line.
- Optional date filter: if the file's fills are all from a different day than the journal entry, it warns but still imports (prop firm exports often span a date range).

## Technical notes

- New `src/lib/tradovate-csv.ts` (pure client-side, no imports beyond types): quote-aware CSV splitter, flexible header matching for `Account`, `Symbol` / `Contract`, `B/S` / `Side`, `Filled Qty` / `Fill Qty` / `Qty`, `Avg Fill Price` / `Fill Price`, `Fill Time` / `Timestamp`, `Status`. Keeps only rows whose status is filled and whose filled qty > 0.
- Pairing: per symbol, FIFO match of opposing-side quantities into round trips (handles partial fills and splitting a larger order across several exits). Direction = side of the opening order. P&L = (exit − entry) × qty × point value, using a small contract multiplier table (NQ/MNQ, ES/MES, YM/MYM, GC/MGC, CL/MCL, RTY/M2K, 6E, etc.) keyed off the symbol root, defaulting to 1 with a note in the message when the root is unknown. Result = win/loss/breakeven from the signed P&L, same as the live path.
- `src/components/hub/Journal.tsx`: new `CsvImport` component rendered beside `TradovateImport`; `TradovateImport` no longer swallows the area when there are no connections. `onImport` in `TradesEditor` gains an append mode so CSV adds to existing rows while the live pull keeps replacing.
- No database change, no server function, no new dependency. Build and page loads verified before publishing.

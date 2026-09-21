# Streamline journal CSV Sync flow

## What
Reduce the journal CSV import to a single click: the "Sync" button immediately opens the file picker, and selecting a file parses and imports the trades automatically. Keep the review-before-saving step for the trade rows themselves.

## How
1. In `src/components/hub/Journal.tsx`, replace the current `CsvImport` panel (open/close toggle + file input inside a collapsible card) with a compact inline row:
   - Optional "Account label" text input (placeholder e.g. "Apex 50K #2").
   - "Sync" button that triggers a hidden `<input type="file">` via `fileRef.current.click()`.
2. Keep the existing `handleFile` parser call on the file input's `onChange`; it will append parsed trades immediately using the current label value (falling back to "CSV import" when blank).
3. Show the existing success / error / skipped / open-position notes directly below the row after a file is processed.
4. Remove the `open` state and the "Hide Sync" toggle label.
5. Retain the review-before-saving behavior: imported trades populate the entry's trade rows but the member still presses Save when ready.

## Out of scope
- No change to parsing logic in `src/lib/tradovate-csv.ts`.
- No change to how imported trades are combined with live-pulled or manual trades.
- No database, server function, or dependency changes.

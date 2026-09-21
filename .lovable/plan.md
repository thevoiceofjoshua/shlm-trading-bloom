# Add CSV import instructions dropdown

Add a small dropdown to the journal's CSV sync row that explains how to export and import a Tradovate Orders CSV.

## What to build

- In `CsvImport` (inside `src/components/hub/Journal.tsx`), add an "Instructions" toggle button next to the Label/Sync/Open Tradovate controls.
- When expanded, show a concise numbered list:
  1. Sign in to Tradovate.
  2. Go to the **Orders** tab / order history.
  3. Export as **CSV** (usually a download icon).
  4. Choose the CSV file here, or drag it onto the drop area.
  5. Optionally label the account (e.g. "Apex 50K #2").
  6. Review the imported trades before saving the journal entry.
- Mention that only filled orders become round-trip trades; open positions are skipped.
- Keep it lightweight: a disclosure panel with a chevron, no new dependencies, no server changes.

## Verification

- Typecheck and build clean.
- Public pages still load.
- No functional changes to import logic.

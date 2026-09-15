# Journal: passcode vault gate, PnL totals, cleaner calendar

## 1. Vault passcode screen

When "Open journal" is pressed, a security-terminal screen appears before any journal content:

- Dark panel, monospace amber/green type, faint scanline sweep and a blinking cursor.
- Short boot lines ("SHLM SECURE VAULT / AUTHENTICATION REQUIRED").
- A 5-digit passcode field plus an on-screen numeric keypad (works with typing too), showing filled dots as digits are entered.
- Correct code `11711`: a short "decrypting / vault opening" sequence plays (split doors slide apart, text scrambles then resolves), then the journal appears.
- Wrong code: red glitch shake, "ACCESS DENIED", entry clears so they can retry. Closing the overlay resets the gate, so it asks again next time.

This is a decorative layer on top of the real sign-in; the actual entries stay protected by existing authentication.

## 2. Week and month PnL summary

A summary strip at the bottom of the journal shows:

- This week's total PnL (Monday-Sunday of the current week)
- This month's total PnL (current calendar month)

Both are computed from existing saved entries using the same PnL logic already used for day totals (trade rows when present, otherwise the entry amount), green for positive, red for negative, and a trade/entry count under each figure.

## 3. Remove the calendar legend

Delete the small colour-key text under the calendar ("profit day", "loss day", "entry with no PnL logged"). No replacement.

## Technical notes

- New `src/components/hub/JournalVaultGate.tsx`: self-contained gate component with its own CSS-keyframe animations (scanline, glitch, door slide) defined via Tailwind arbitrary keyframes or a small scoped `<style>`; colours via existing semantic tokens plus terminal accents.
- `Journal.tsx` renders the gate until unlocked (state lives in `Journal`, so it resets on each open since the modal unmounts).
- New `WeekMonthSummary` block inside `Journal.tsx` using one extra `getMemberNotesRange` call spanning `min(weekStart, monthStart) … max(weekEnd, monthEnd)`, since the existing query is scoped to the visible calendar month only. Reuses `pnlNumber`/`formatMoney` — no server or schema changes.
- Legend markup at `Journal.tsx` lines 448-456 removed.

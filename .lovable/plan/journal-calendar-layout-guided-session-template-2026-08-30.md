# Journal: calendar layout + guided session template

Turn the SHLM Centre journal into a monthly calendar where every date is clickable, and replace the blank textarea with a structured, emoji-led session review template.

## What you'll see

**Month calendar**
- A month grid (Sun–Sat) with arrows to move between months and a "Today" button.
- Each day cell is a tappable button. Days with a saved entry get a small dot; today is outlined; the selected day is filled.
- Tapping a date opens that date's journal below the grid (no page change).

**Session tabs**
- Inside the selected date: NY Open / Gold Session tabs, same as today. Each session has its own entry.

**Guided template (replaces the empty box)**
Structured prompts, each saved with the entry:
- 🎯 Bias — Long / Short / Neutral (pill buttons)
- 📊 Key levels I watched — short text
- ✅ What I executed well — text
- ⚠️ What went wrong — text
- 🧠 Emotion during the session — 😌 calm / 😬 anxious / 😤 frustrated / 🤩 overconfident / 😐 flat (pick one)
- 📈 Session outcome — 🟢 green / 🔴 red / ⚪ breakeven / 🚫 no trade
- 📝 One rule for tomorrow — text
- Free notes — open textarea for anything else

An "Insert blank template" affordance isn't needed since the fields are always visible; empty fields are simply skipped when displaying.

**Save + status**
Single "Save entry" button, with "Saved" confirmation and unsaved-changes hint, as today.

## Technical notes

- No schema change. `member_notes.body` keeps storing the entry; the structured answers are serialized as JSON inside `body` and parsed on read. Legacy plain-text entries are detected (non-JSON) and loaded into the free-notes field so nothing is lost.
- New server function in `src/lib/hub.functions.ts`: `getMemberNotesRange({ from, to })` — authenticated, selects `note_date, session, body` for the signed-in user between two dates. Used to mark which calendar days have entries. Existing `getMemberNotes` / `saveMemberNote` stay as-is.
- New component file `src/components/hub/Journal.tsx` exporting `Journal({ userId })`, containing the month grid, session tabs, and template form. `BiasJournal` in `src/components/hub/EconomicCalendar.tsx` is removed and `src/routes/centre.tsx` renders `<Journal userId={user.id} />` in its place.
- Dates are handled as local-date `YYYY-MM-DD` strings (no UTC shift), consistent with the viewer-local time approach used elsewhere in the Centre.
- Mobile: calendar cells are min 44px touch targets, grid stays full-width on small screens, template fields stack; desktop shows the calendar and the open entry side by side on `lg`.
- Styling uses existing semantic tokens (`border-border`, `bg-card`, `text-muted-foreground`, pill buttons) — no new colors.

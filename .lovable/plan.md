# Journal: PnL calendar, multiple entries, and personal trading rules

Make each calendar date bigger and color-coded by the day's PnL, allow several entries per day, and add a personal rulebook with a red rule-break alert.

## What you'll see

**Bigger, color-coded date cells**
- Cells grow from a small square to a taller cell (about 64px tall on desktop, still full-width and touch-friendly on mobile) with the date number on top and the day's PnL underneath.
- Cell background reflects the day's net PnL: soft green tint for a positive day, soft red tint for a negative day, neutral for breakeven or no entry.
- PnL text reads compactly: `+$450`, `-$220`, `$0`. Days with entries but no PnV number logged show a small dot instead, as today.
- Today stays outlined; the selected day keeps a strong border/ring so selection is still obvious on a tinted cell.
- The legend under the grid explains: green = profit day, red = loss day, dot = entry with no PnL logged.

**PnL field on the entry**
- New field near the top of the template: `💵 PnL for this entry` — a number input in dollars, negative allowed (e.g. `-220`).
- The day's calendar figure is the sum of all entries logged on that date.
- The existing `📈 Session outcome` pills stay; PnL is separate and drives the calendar color.

**Multiple entries per day**
- The session tabs stop being containers. The selected date shows a list of that day's entries, each card labeled with its session and PnL (e.g. "NY Open · +$450").
- "＋ Add entry" creates a new blank entry for the selected date; each entry picks its own session (NY Open / Gold Session) inside the form.
- Tapping an entry in the list opens it for editing; each entry saves on its own and can be deleted.

**First-time rulebook setup**
- The first time a member opens the journal, a one-time setup panel appears: "Set your daily trading rules."
- They add their own rules as a list (e.g. "No trades in the first 5 minutes", "Max 2 trades per session", "Always set a stop"), plus one consequence they must carry out if any rule is broken (free text, e.g. "50 push-ups and no trading tomorrow").
- Rules and the consequence can be edited later from an "Edit my rules" link in the journal header. Setup can't be skipped into an empty state — at least one rule and a consequence are required to continue.

**Rule check on every entry**
- Each entry form lists their rules with "Followed / Broken" toggles, so the journal knows exactly what happened.
- On save, if any rule is marked broken, a full-screen alert appears: a flashing red panel reading "RULES BROKEN", the specific rules that were broken, and the consequence in large type.
- The alert has a single acknowledgement button ("I'll do it") — dismissing it records the acknowledgement with the entry. Entries with a broken rule get a small red flag in the day's entry list.
- Flashing respects `prefers-reduced-motion`: it becomes a solid red panel instead of a pulsing one.


## Technical notes

- No schema change. `member_notes` keeps its `(user_id, note_date, session)` uniqueness; multiple entries per day are stored by writing a slot-suffixed session key (`ny-open#<slot>`), with the real session and all answers inside the JSON `body`. Reads split the suffix off, so legacy rows (`ny-open`, `gold`) load as the first entry for their day.
- `Entry` in `src/components/hub/Journal.tsx` gains `session` and `pnl` (string, parsed to a number for display/sum). `parseEntry` defaults both for older JSON and legacy plain-text notes.
- Day aggregation: sum parsed `pnl` across a date's rows to pick the tint and the displayed figure; entries with no PnL contribute 0 and only trigger the dot.
- `src/lib/hub.functions.ts`: `saveMemberNote` and `getMemberNotesRange` stay as-is; a `deleteMemberNote` server function is added (authenticated, scoped to `auth.uid()`) for removing an entry.
- Colors use existing semantic tokens plus low-opacity success/destructive tints — no new palette entries; contrast checked in the dark theme.
- Rulebook storage: new table `public.member_rules` (one row per member) holding the rules list and the consequence text, with owner-only access scoped to `auth.uid()` and the standard grants. Server functions `getMemberRules` / `saveMemberRules` are added to `src/lib/hub.functions.ts` behind `requireSupabaseAuth`.
- Rule results are stored inside the entry JSON (`ruleChecks: Record<ruleId, "followed" | "broken">`, plus `consequenceAcknowledged`), so no extra table and older entries simply have no checks.
- The alert is a new `RuleBreakAlert` component rendered from the journal, using a keyframed opacity/background pulse defined in `src/styles.css` and disabled under `prefers-reduced-motion`.
- Role parity: the journal, rules, and consequence are the member's own data. Member and full admin behave identically; SHLM MOD keeps read-only program access while still setting rules and writing their own journal entries, as today.


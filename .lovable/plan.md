# Journal as a modal + first-name-only header

Three changes: open the journal from a button at the top of the SHLM Centre instead of it sitting in the page stack, show only first names in the top-right of member pages, and (previously requested) screenshots plus multi-trade logging inside a single entry.

## 1. Journal opens from a button

- The journal no longer renders inline at the bottom of the Centre. It's replaced by a prominent "📓 Open journal" button in the Centre header row, next to the "SHLM Centre" title.
- Clicking it opens the journal in a full-screen overlay panel: dark backdrop, rounded panel, sticky header with the title and a close (✕) button, scrollable body containing the existing calendar + entry form.
- Closing works via ✕, the Esc key, or tapping the backdrop. Page scroll is locked while it's open, and focus returns to the button on close.
- On mobile the panel is effectively full-screen with safe-area padding; on desktop it's a wide centered panel (max ~1100px).
- Everything inside the journal — calendar, PnL tints, rules setup, rule-break alert — behaves exactly as it does today.

## 2. First name only in the top right

- `/centre` and `/dashboard` currently print the signed-in email address in the top-right. Both change to show the first name only (e.g. "Joshua"), derived from the account name when present, otherwise from the email's local part with the first letter capitalised.
- The account menu dropdown keeps the email inside the opened panel (it's useful there for confirming which account you're in), but nothing on the page surface shows it.
- The admin dock's expanded details also switches to the first name.

## 3. Multiple trades inside one entry + screenshots

**Trades inside the entry**
- New section near the top: `🔢 How many trades did you take this session?` — a number input with quick pills (0, 1, 2, 3, 4, 5+).
- Setting a number reveals that many trade rows. Each row is compact and mobile-friendly:
  - Pair / instrument (short text, e.g. NASDAQ, XAU/USD)
  - Direction — 📈 Long / 📉 Short pills
  - Result — 🟢 Win / 🔴 Loss / ⚪ Breakeven pills
  - PnL in dollars (plain number; Win makes it positive, Loss negative, same behaviour as the entry PnL field today)
  - Optional one-line note ("chased the entry")
- Rows can be added ("＋ Add trade") or removed individually; the count stays in sync with the rows.
- `💵 PnL for this session` becomes the sum of the trade rows once any trade has a PnL, and stays manually editable when no trades are logged.

**One entry per session, per day**
- "＋ Add entry" no longer creates duplicates for a session that already has an entry — each day holds at most one NY Open entry and one Asia Session entry.
- Days that already contain several entries for the same session still display and can be edited or deleted, so nothing is lost.

**Screenshots at the bottom of the notes**
- Under `🗒️ Free notes`: `📸 Screenshots` — a drop zone / "Add screenshots" button accepting images (PNG, JPG, WebP, HEIC), multiple at once, up to 10 per entry and 10MB each.
- Thumbnails render in a small grid with a remove (✕) button; tapping a thumbnail opens the full image in a lightbox.
- Uploads show a progress state; a failed upload shows an inline message and doesn't block saving the rest of the entry.

## Technical notes

- Journal overlay: `src/routes/centre.tsx` gains local `journalOpen` state, the header button, and renders `<Journal userId={user.id} />` inside a new overlay wrapper (portal-free fixed container with `role="dialog"`, `aria-modal`, Esc handler, body scroll lock). `Journal.tsx` gets an optional `onClose` prop only for the header ✕; its internals are unchanged.
- First name: a small shared helper (`displayFirstName`) derives the name from user metadata `full_name`/`name` and falls back to the email local part, splitting on `.`/`_`/`-` and capitalising. Used in `src/routes/centre.tsx`, `src/routes/dashboard.tsx`, and `src/components/AdminBar.tsx`. No auth or data changes.
- Entry model in `src/components/hub/Journal.tsx` gains `tradeCount: string`, `trades: Trade[]` (`{ id, instrument, direction, result, pnl, note }`), and `screenshots: { path: string }[]`, all defaulting to empty in `parseEntry` so legacy JSON and plain-text notes load unchanged. No `member_notes` schema change.
- Day PnL aggregation is unchanged (sum of each entry's `pnl`); `pnl` is derived from `trades` when trades exist.
- Single-entry-per-session is a UI rule only; the storage key stays `<session>#<slot>` so existing rows remain readable and deletable.
- Screenshot storage: new private Storage bucket `journal-shots` with owner-scoped policies requiring the first path segment to equal `auth.uid()` (insert/select/delete for `authenticated`). Paths are `<user_id>/<note_date>/<uuid>.<ext>`. Uploads go straight from the browser via the generated Supabase client; display uses short-lived signed URLs. Removing a screenshot deletes the object; deleting an entry removes its objects.
- Role parity: member, SHLM MOD, and SHLM Founder all get the same journal button, overlay, and first-name header, each scoped to their own data.
- Styling reuses existing semantic tokens and pill patterns — no new colors.

# Journal: screenshots + multiple trades inside one entry

Two changes to the SHLM Centre journal: attach screenshots to an entry, and log every trade of a session inside a single entry instead of creating separate entries per day.

## What you'll see

**Trades inside the entry**
- New section near the top: `🔢 How many trades did you take this session?` — a number input with quick pills (0, 1, 2, 3, 4, 5+).
- Setting a number reveals that many trade rows. Each row is compact and mobile-friendly:
  - Pair / instrument (short text, e.g. NASDAQ, XAU/USD)
  - Direction — 📈 Long / 📉 Short pills
  - Result — 🟢 Win / 🔴 Loss / ⚪ Breakeven pills
  - PnL in dollars (plain number; Win makes it positive, Loss makes it negative, same behaviour as the entry PnL field today)
  - Optional one-line note ("chased the entry")
- Rows can be added ("＋ Add trade") or removed individually; the trade count stays in sync with the number of rows.
- `💵 PnL for this session` becomes the sum of the trade rows automatically once any trade has a PnL, and stays manually editable when no trades are logged (so existing entries keep working).

**One entry per session, per day**
- The day list stops offering "＋ Add entry" for a session that already has an entry. Each day holds at most one NY Open entry and one Asia Session entry; opening a date opens that session's entry directly.
- Existing days that already contain several entries for the same session still display and can be edited or deleted, so nothing is lost — they just can't be multiplied further.

**Screenshots at the bottom of the notes**
- Under `🗒️ Free notes`: `📸 Screenshots` — a drop zone / "Add screenshots" button accepting images (PNG, JPG, WebP, HEIC), multiple at once, up to 10 per entry and 10MB each.
- Thumbnails render in a small grid with a remove (✕) button; tapping a thumbnail opens the full image in a lightbox.
- Uploads show a progress state and are saved with the entry; a failed upload shows an inline message and doesn't block saving the rest.

## Technical notes

- No schema change to `member_notes`. `Entry` in `src/components/hub/Journal.tsx` gains:
  - `tradeCount: string` and `trades: Trade[]` where `Trade = { id, instrument, direction, result, pnl, note }`
  - `screenshots: { path: string; width?: number; height?: number }[]`
  Both default to empty in `parseEntry`, so legacy JSON and plain-text notes load unchanged.
- Day PnL aggregation stays the same (sum of each entry's `pnl`); `pnl` is derived from `trades` when trades exist.
- Single-entry-per-session is enforced in the UI only: the storage key stays `<session>#<slot>` so existing multi-entry rows remain readable and deletable.
- Screenshot storage: new private Storage bucket `journal-shots` with owner-scoped policies keyed on the first path segment being `auth.uid()` (`insert`/`select`/`delete` for `authenticated`). Files are stored at `<user_id>/<note_date>/<uuid>.<ext>`.
- Uploads go directly from the browser through the generated Supabase client (`supabase.storage.from('journal-shots').upload(...)`); display uses signed URLs fetched on render (1 hour expiry) via a small `useSignedUrls` helper in the journal component. No server function needed.
- Removing a screenshot deletes the object and drops it from the entry JSON on save; deleting an entry also removes its objects.
- Role parity: journal data is the member's own. Member, SHLM MOD, and SHLM Founder all get the same journal behaviour, each scoped to their own user id.
- Styling uses existing semantic tokens and pill patterns already in the journal — no new colors.

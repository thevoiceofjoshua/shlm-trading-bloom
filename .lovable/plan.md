# Personal journal vault passcodes

## What will change

1. **Store one passcode per signed-in member**
   - Add a `journal_vault_passcodes` table keyed by the member’s user ID.
   - Store only a salted, one-way passcode hash—not the readable passcode.
   - Enable row-level access so members can only reach their own vault record; privileged service access remains available for administration.
   - Pre-set the two requested accounts directly in the database:
     - `mikestaten29@gmail.com` → `11711`
     - `joschewagner56@gmail.com` → `090994`

2. **Add authenticated passcode operations**
   - Add signed-in server operations to check whether the current member has configured a passcode, save their first passcode, and verify later attempts.
   - Always derive the member identity from the authenticated session rather than accepting a user ID from the screen.
   - Allow numeric passcodes of 5–8 digits, covering both pre-set codes.
   - Make first-time setup create-only so an existing passcode cannot be silently overwritten.

3. **Adapt the existing terminal gate**
   - Keep the current scanlines, keypad, error glitch, and vault-opening animation.
   - While the member’s vault status loads, show a short terminal initialization state.
   - If no passcode exists, show “Set your vault passcode,” collect the code twice, reject mismatches, and save it before playing the unlock animation.
   - If a passcode exists, show the normal locked keypad and verify it against that member’s saved hash.
   - Keep the gate decorative and leave Supabase authentication and journal row protections unchanged.

4. **Wire and verify all member roles**
   - Update `Journal.tsx` to use the new per-user gate while preserving its reset-on-close behavior.
   - Leave the homepage vault boot and `/auth` page unchanged.
   - Verify Founder and SHLM MOD receive their pre-set-code prompt, a new member receives setup/confirmation, incorrect entries stay locked, correct entries open the journal, and member data remains isolated.
   - Check desktop/mobile presentation, keyboard/keypad input, build output, and database access rules.

## Technical details

- Database changes will be applied through an approved Supabase migration with explicit grants and RLS policies.
- The two initial account records will be added as a separate data update after the table exists.
- Passcode hashing and comparison will run on the server; no shared code or readable personal code will remain in the browser bundle or database.
- No passcode reset/recovery flow is included because it was not requested.

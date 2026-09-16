# Match the passcode boxes to each member's own code length

## The problem

The journal vault entry screen always draws 8 boxes, the longest code allowed, so a 6-digit code looks wrong.

## What changes

1. **Remember the code length**
   - Store the number of digits alongside each member's saved code (the code itself stays a one-way, unreadable value).
   - Set it for the two existing accounts: your account 6 digits, Mike's 5 digits.

2. **Look it up when the screen opens**
   - The check that already asks "has this member set a code?" also returns the length.
   - The entry screen draws exactly that many boxes, and unlocks as soon as that many digits are entered.
   - If a length is somehow missing, the screen falls back to today's flexible behaviour.

3. **First-time setup unchanged**
   - Members who haven't set a code still get the same "set your vault passcode" screen with 5-8 digits, and their chosen length is saved for future opens.

4. **Verify for every role**
   - Member, SHLM MOD, and Founder all see the box count that matches their own code, with correct/incorrect entry behaving as it does today.

## Technical notes

- Migration: add `passcode_length smallint` to `journal_vault_passcodes`, backfill 6 and 5 for the two known user IDs.
- `getJournalVaultStatus` returns `{ configured, length }`; `setJournalVaultPasscode` writes `passcode.length`.
- `JournalVaultGate` takes the length from status and uses it for the dot row and auto-submit threshold; `MAX_LENGTH` stays the setup cap.
- No change to hashing, RLS, or the real Supabase auth gate.

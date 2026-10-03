# Recruiter payouts via Wise

## What you'll get

**Founder (admin area + Recruiter Portal)**
- A "Wise payouts" card in the admin area: paste your Wise API token, pick Sandbox or Live, and save. After that it only shows "Connected ✓ (Sandbox)" or "Connected ✓ (Live)", your Wise business profile name, and Replace and Disconnect buttons. The token is never shown again.
- Sandbox and Live each keep their own token. Switching between them is one toggle, with no rebuild. Live mode stays locked until a sandbox payout has reached "completed".
- Each recruiter card shows **Earned**, **Paid out** and **Owed**. Owed = earned − completed payouts − payouts still in progress.
- A "Pay recruiter" button opens a confirmation screen with:
  - the recruiter's name
  - their bank in short form (for example "Chase ••••4821 · USD")
  - the amount you're sending (filled in with what's owed, and you can lower it)
  - Wise's quoted fee, the total taken from your balance, the amount the recruiter receives, and the exchange rate
  - a clear SANDBOX or LIVE badge
  - a "Confirm & Send" button
- No money moves until you click "Confirm & Send". The quote is fetched when the screen opens. If it expires, the screen asks you to refresh it.

**Recruiter (their own portal view)**
- "Add bank account": they pick a country and currency, and the form shows the fields Wise requires for that country (IBAN, sort code, routing number and so on).
- Once saved, they only see the short form ("Barclays ••••1234 · GBP") and a "Replace" button.
- "Payout history" lists their own payouts: date, amount, currency and status.
- They never see your Wise account, your token, other recruiters, or other recruiters' payouts.

## Payout flow

```text
Recruiter submits bank form ──> server ──> Wise: create recipient
                                   └─ saves only the Wise recipient ID + short form
Founder clicks Pay ──> server: check Founder + amount <= owed
                   ──> Wise: quote ──> confirmation screen (fee, total, rate)
Founder clicks Confirm & Send ──> server re-checks Founder, owed amount, quote
   ──> payout saved as "pending" (locks the amount)
   ──> Wise: create transfer ──> Wise: pay it from your balance
   ──> status updated from Wise's reply, then by Wise's status updates
```

## Important limitation to know up front

Wise limits **paying for** transfers through the API with a personal token for some accounts. This mainly affects UK and EU business accounts, where Wise asks for an extra approval step. If your account is affected, the transfer is still created and shows as "Awaiting funding". You then approve it in the Wise app or website with one tap, and the status updates here automatically. The sandbox test will show which case applies to you before any real money is involved.

## Access rules (all checked on the server)
- Only the Founder can save or replace the token, switch Sandbox/Live, get quotes, send payouts, or see owed and paid figures for all recruiters.
- A recruiter can only read and replace their own bank record and read their own payout history.
- Your token is stored encrypted and is only read inside the server functions that send payouts. It is never included in anything sent to a browser.
- Full bank numbers are never stored. They pass through the server once, on their way to Wise.

## Technical details

**Secrets**
- `WISE_ENC_KEY`: a randomly generated encryption key used to encrypt the Wise tokens before they're stored. It follows the same pattern as the Tradovate credentials.
- `WISE_WEBHOOK_PUBLIC_KEY` is not needed. Wise publishes a fixed public key for checking its status updates, and that key is built into the code.

**New tables**
| Table | Columns | Access |
|---|---|---|
| `wise_connection` | mode (sandbox/live, unique), token_cipher, token_iv, profile_id, profile_name, connected_at | Server only (no client access) |
| `wise_settings` | single row: active_mode, sandbox_verified_at | Server only |
| `recruiter_bank_accounts` | recruiter_id (unique per mode), mode, wise_recipient_id, bank_name, last4, currency, country, holder_name, timestamps | Recruiter can read their own row (short-form columns only). All writes go through the server |
| `recruiter_payouts` | recruiter_id, mode, amount_cents, currency, source_amount, fee, quote_id, wise_transfer_id, customer_transaction_id (unique), status (pending/processing/completed/failed/cancelled), wise_status, error, created_by, timestamps | Recruiter can read their own rows. All writes go through the server. Founder reads through the server |

All tables get GRANTs, RLS and an updated_at trigger. Owed is calculated from `recruiter_lands` and `recruiter_payouts` together. A database lock per recruiter prevents two payouts going out for the same money.

**Wise API calls**
- Sandbox address: `api.sandbox.transferwise.tech`. Live address: `api.wise.com`. The active mode picks which one is used.
- `GET /v2/profiles`: run when you save the token. It finds your business profile and confirms the token works.
- `GET /v1/account-requirements?source=USD&target={cur}&sourceAmount=100`: builds the recruiter's bank form for their country.
- `POST /v1/accounts`: creates the recipient. Only the returned ID and short form are kept.
- `POST /v3/profiles/{pid}/quotes`: gets the fee, rate and total for the confirmation screen.
- `POST /v1/transfers`: creates the transfer, using `customerTransactionId` set to the payout row ID. This makes a retry safe and prevents double-sending.
- `POST /v3/profiles/{pid}/transfers/{tid}/payments` with `{type:"BALANCE"}`: pays for the transfer from your balance.
- `GET /v1/transfers/{tid}`: checks the status when you or the recruiter open the portal.
- Webhook at `/api/public/wise-webhook`, for the `transfers#state-change` event. The signature is checked against Wise's public key, and then only the payout status is updated.

**Files**
- `src/lib/wise.server.ts`: the Wise client and encryption.
- `src/lib/payouts.functions.ts`: saving the connection, the recruiter bank form, quote, confirm & send, payout history and status checks.
- `src/routes/api/public/wise-webhook.ts`: receives Wise's status updates.
- Changes to `recruiters.tsx` (Owed, Pay button and confirmation screen, recruiter bank card and history) and to `admin.tsx` (the Wise card).

**Untouched:** the landed-count controls, the Centre, membership payments, sign-in.

**Testing order:** connect the sandbox token, add a recruiter bank account in sandbox, send a sandbox payout, mark it completed using Wise's sandbox tools, and check that Owed drops. After that, Live can be unlocked.

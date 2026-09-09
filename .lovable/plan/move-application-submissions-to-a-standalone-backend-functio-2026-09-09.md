# Move application submissions to a standalone backend function

Your site is now hosted outside Lovable, so the piece that saved applications no longer has the private key it needs. This plan moves that step into a backend function that runs on the database side, where the key is always available.

## What gets built

1. **A new backend function named `submit-application`**
   - Accepts a POST with the same fields the form already sends: entry level, full name, email, phone, experience, goals, scheduled date/time, timezone.
   - Validates the input and rejects bad requests with a clear message.
   - Saves the row into the applications table exactly as today (including the same defaults for status and payment-link fields).
   - Builds the same two readable time strings: the applicant's local time and the Los Angeles time.
   - Sends the admin notification to the address already stored in your settings, with reply-to set to the applicant so you can answer them directly.
   - Returns the same response the form expects: the new application id, timezone, applicant local time, and LA time.
   - Answers browser preflight checks and allows requests from any origin, so it works from your own domain.
   - Runs without requiring a signed-in user, since the application form is public.

2. **The apply page switches to calling the new function**
   - The form posts directly to the new endpoint using your public key.
   - Success and error handling on the page stay exactly as they are now: same confirmation screen, same wording, same fields.

3. **Email content**
   - The admin email keeps all the same information (applicant details, entry level, both times, experience, goals) in a clean, simple dark layout written directly inside the function. The existing on-site email templates are left untouched, so nothing else about your emails changes.

## What does not change

- No database changes, no new tables, no policy changes.
- Pricing, checkout, receipts, denial emails, admin portal, and the member hub are untouched.
- The existing in-app submission code stays in place as a fallback and is simply no longer used by the form.

## Technical notes

- New files: `supabase/functions/submit-application/index.ts`, plus a per-function block in `supabase/config.toml` setting `verify_jwt = false`.
- Validation with Zod (via npm specifier), insert through the function's built-in service-role client, times formatted with `toLocaleString` using `dateStyle: "full"` / `timeStyle: "short"` to match current output byte-for-byte.
- Email sent by posting to the Lovable email API using the existing `LOVABLE_API_KEY`, `sender_domain: support.shlmtrdng.com`, from `SHLM <noreply@support.shlmtrdng.com>`, label `application-notification`, idempotency key `application-notification-<id>`, subject `New mentorship application — <name> (<level>)`. Email failure is logged and does not fail the submission, same as today.
- CORS headers: `access-control-allow-origin: *`, methods `POST, OPTIONS`, headers `authorization, x-client-info, apikey, content-type`.
- `src/routes/apply.tsx` replaces `useServerFn(submitApplication)` with a `fetch` to the function URL, sending `apikey` + `Authorization: Bearer <publishable key>` from `import.meta.env`.
- After deploy, the invoke URL will be `https://kepbnosffciyyrfnisda.supabase.co/functions/v1/submit-application`, which I will confirm in chat.
- Note: this project's stack normally keeps server logic in-app rather than in backend functions; the function is being used here specifically because your external host cannot hold the private key.

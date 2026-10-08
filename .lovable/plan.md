# Automatic recruiter credit when a referred student pays

## What you get
- The "Who referred you?" box on the application form becomes a required dropdown listing your current recruiters by name, plus an "Other / no one" option.
- When that applicant pays the $500 mentorship, their recruiter automatically gets +1 landed client in the Recruiter Portal for that month. Earned, Owed and the monthly bonus update the same way they do with a manual +1.
- If they picked "Other / no one", nothing is credited.
- Each paid application can only credit a recruiter once, even if Stripe resends the payment notice.
- Your manual −1 / +1 / Add controls stay exactly as they are, so you can still correct anything by hand.
- Your new-application email still shows "Referred by" with the recruiter's name.
- Unpaid, denied or expired applications never credit anyone.

## Technical details
- Migration: add `referred_by_recruiter_id uuid` and `referred_by_name text` to `applications`; add nullable `application_id uuid` to `recruiter_lands`, with a unique index so one application can only produce one automatic land.
- New public read route `/api/public/recruiters-list` returns only recruiter id and display name (no emails or other data), so the form works on the external domain too.
- `apply.tsx`: replace the text box with a select loaded from that route; it sends the recruiter id, or "other".
- `submit-application.ts`: check that the id really has the recruiter role and save both columns. The email uses the stored name.
- `stripe-webhook.ts` on `checkout.session.completed` with `payment_status = paid`: read `metadata.application_id`, look up the referred recruiter, and insert `recruiter_lands { delta: +1, month: Pacific month, application_id, created_by: null }`. A conflict on the unique index is ignored, so duplicate webhook deliveries do nothing.
- Manual controls in `recruiters.functions.ts` are untouched (`application_id` stays null for those).
- Note: the shlmtrdng.com copy needs a redeploy before this works there.

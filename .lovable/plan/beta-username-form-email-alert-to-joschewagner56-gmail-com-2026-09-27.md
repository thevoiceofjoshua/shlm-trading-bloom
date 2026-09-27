# Beta username form: email alert to joschewagner56@gmail.com

## What I found
- **Where it goes:** The form sends the username + note to the server, which only emails it. Nothing is saved to the database.
- **Email is already set up:** Your sending domain (support.shlmtrdng.com) is verified and working — application alerts and other emails already send through it. A "Beta access request" email design already exists. **No new service or API key is needed.**
- **Why you get nothing:** The form sends to the site's "admin notification" address, which is set to **shalomtradinginc@gmail.com**. Your address (joschewagner56@gmail.com) is only a backup that never kicks in. So submissions (if any) went to the Shalom inbox, not yours. The delivery log shows no beta request emails to your address.

## The change (additive, beta form only)
1. Lock the beta request email to always go to **joschewagner56@gmail.com**, regardless of the shared admin address. Application alerts keep going to shalomtradinginc@gmail.com — untouched.
2. Keep the member's email as "reply-to" so you can reply straight to them.
3. Send a test through the real flow and confirm it shows as delivered in the email log.

## Not changing
- Beta password gate, video, steps, form fields, buttons, or messages.
- Any other email or notification.

## Optional (only if you want it)
- Also save each submission to a list you can view in the admin panel, as a backup if an email is missed. Not included unless you say so.

## Technical details
- `src/lib/email-templates/beta-username.tsx`: add `to: 'joschewagner56@gmail.com'` to the template entry (send helper already honors template-level `to`).
- `src/lib/beta.functions.ts`: no logic change required; recipient override comes from the template.

# Mobile-responsive vault and credential screens

## Goal
Make every terminal/vault screen fit real phone viewports without pinch-zooming, horizontal clipping, or inaccessible controls, while preserving the grayscale terminal design, animations, authentication behavior, and role permissions.

## Changes
- Update the shared vault frame and credential inputs so all panels can shrink to the available width, long labels wrap safely, and iPhones do not auto-zoom when an input receives focus.
- Refine the homepage vault boot for phones: use the dynamic viewport and safe-area insets, reduce mobile-only spacing and logo/header height, keep the account/admin panel within the screen width, and allow normal vertical scrolling when the chosen form is taller than a short phone.
- Refine the journal vault gate for narrow screens: reduce mobile padding and gaps, size passcode boxes and keypad from the available width, and keep all controls reachable without changing per-user passcode lengths or setup behavior.
- Make the Founder/SHLM MOD prompt a safe-area-aware, vertically scrollable phone overlay, and apply the same width/spacing safeguards to `/auth`, enrollment access, and the Founder console credential area.
- Keep desktop layouts and all current login, admin, journal, and vault-opening behavior unchanged.

## Verification
- Check the homepage boot, member sign-in/create-account, inline admin access, `/auth`, enrollment credentials, Founder prompt/console, and journal vault at narrow and short phone sizes, including 320×568 and 390×844.
- Focus each credential input to confirm the browser does not zoom the page, confirm there is no horizontal overflow, and confirm every action remains reachable by scrolling vertically when necessary.
- Verify the build and preserve identical behavior for members, SHLM MOD, and Founder accounts.

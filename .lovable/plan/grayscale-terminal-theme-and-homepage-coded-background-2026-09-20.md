# Grayscale terminal theme and homepage coded background

## Scope
- Recolor every existing terminal/vault surface from green and amber to a deliberate black, white, and gray palette while preserving its current structure, copy, controls, and behavior.
- Add a subtle animated terminal treatment behind the existing marketing homepage after the intro clears, without changing any homepage content, typography, spacing, or section layout.

## Terminal and credential surfaces
- Replace the shared vault color tokens with grayscale values: near-black backgrounds, charcoal panels, white primary text/actions, muted-gray secondary text, and translucent gray borders.
- Update the homepage vault boot, its embedded member and admin access areas, `/auth`, the SHLM Founder/SHLM MOD prompt, the founder console credential frame on `/admin`, and enrollment access on `/enroll/:applicationId` through the shared palette.
- Convert the JournalVaultGate’s currently local emerald/amber styling to the same shared grayscale palette, including passcode boxes, keypad, scan sweep, glow, boot text, and opening doors.
- Keep error/denied states understandable through brighter contrast, labels, and the existing glitch animation rather than introducing a colored accent.
- Make the Google mark monochrome inside these screens so no leftover terminal color treatment remains.

## Marketing homepage background
- Add one non-interactive homepage background layer to the post-intro homepage wrapper.
- Use low-contrast grayscale scanlines, a restrained code/grid texture, and a slow moving scan beam inspired by the vault animation.
- Keep the layer behind all existing homepage elements, preserve every current section and call-to-action exactly, and ensure it does not intercept clicks or create horizontal overflow.
- Disable or greatly reduce movement when the visitor prefers reduced motion.

## Consistency sweep
- Search the app for remaining emerald, amber, or green vault-specific styles and update any missed terminal screen, including shared credential frames and passcode/access states.
- Do not recolor ordinary site content, charts, status indicators, or non-terminal features.

## Verification
- Check the homepage intro, skipped/signed-in homepage, `/auth`, enrollment access, admin prompt/console, and journal vault at phone and desktop widths.
- Confirm scanlines and transitions still animate, reduced-motion behavior works, forms remain readable, and no page requires zooming out.
- Confirm the project builds cleanly and no terminal-specific green/amber styling remains.

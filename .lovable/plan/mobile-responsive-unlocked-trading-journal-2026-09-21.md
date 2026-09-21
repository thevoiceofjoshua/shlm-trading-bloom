# Mobile-responsive unlocked Trading Journal

## Goal
Make every part of the journal shown after vault unlock fit real phone viewports without pinch-zooming, sideways clipping, or inaccessible controls, while keeping all journal behavior, calculations, data, and desktop layout unchanged.

## Changes
- Make the unlocked journal panel use the available phone width, smaller mobile-only outer spacing, and natural vertical scrolling inside the existing full-screen overlay.
- Rebuild multi-item header and navigation rows with shrink-safe mobile layouts so the title, rules action, close control, month navigation, selected date, and totals never push beyond the screen.
- Keep the seven-day calendar fully visible at narrow widths by constraining every grid cell and shortening or clipping only the small PnL display when necessary.
- Make entry cards, session controls, PnL controls, rule checks, trade rows, screenshot tiles, save/delete actions, and weekly/monthly summaries stack or wrap cleanly on phones.
- Set all visible journal text inputs and text areas to a mobile-safe font size so focusing them does not trigger iPhone auto-zoom; retain the current smaller desktop typography.
- Make the rules setup screen, success/rule-break alerts, and screenshot viewer safe-area-aware and vertically scrollable on short phones.
- Preserve the current save behavior: totals refresh immediately and the saved entry collapses back into the day list.

## Verification
- Test the unlocked calendar, day list, new/edit entry form, trade editor, rule setup, screenshots, alerts, and weekly/monthly totals at 320×568 and 390×844.
- Focus each journal field and confirm no browser zoom, no horizontal overflow, and all controls remain reachable through normal vertical scrolling.
- Recheck desktop layout and confirm the existing journal data, calculations, save/delete behavior, vault gate, and permissions remain unchanged for members, SHLM MOD, and Founder.

# Smoother admin mode navigation

Replace the current full-width black utility strip with a calm, branded control that feels like part of the site instead of a back-office toolbar. Only the admin/SHLM MOD navigation presentation changes — permissions, role logic, links and actions all stay exactly as they are.

## What changes

1. Floating pill dock instead of a top bar
   - A single rounded pill, centered and floating at the bottom on mobile / top-right on desktop, using the site's own card, border and blur tokens rather than hard black-and-white.
   - Fades and slides in on entry; collapses to a compact chip when scrolling, expands on hover/tap.
2. Cleaner content
   - Drop the raw pathname readout and the shrunken email text from the main row; both move into an expandable detail popover.
   - Role badge becomes a small dot + label ("Admin mode", "Member view", "SHLM MOD") instead of a loud all-caps block.
3. Better links
   - Links become larger, touch-friendly items with the current page shown as an active state, so it reads as navigation rather than debug shortcuts.
   - Same destinations as today: full admin sees Applications, Dashboard, SHLM Centre, Test checkout, Storefront; SHLM MOD sees SHLM Centre and Storefront only.
   - Uses client-side router navigation so switching views no longer causes a full page reload.
4. Actions
   - "View as member" becomes a labelled toggle switch (full admin only, unchanged for SHLM MOD).
   - "Exit" becomes a quieter secondary action so it is no longer the most prominent element on screen.
5. Collapse / dismiss
   - The dock can be minimized to a small floating badge and reopened, so it never competes with the page while testing.
   - Minimized state is remembered for the browser session.

## Role parity

- Member: no dock at all (unchanged).
- SHLM MOD: same new dock, still Centre + Storefront only, no view-as-member toggle, no program mutations.
- Full admin: full link set plus the view-as-member toggle.

## Technical notes

- Work is contained to `src/components/AdminBar.tsx` (redesign) and its layout spacer usage in `src/routes/__root.tsx`, `src/routes/dashboard.tsx`, `src/routes/centre.tsx` — the fixed-top spacer is removed since the dock floats.
- Continues to read `useAdminMode()` for `adminActive`, `modOnly`, `viewAsMember`, `email`, `exit`, `toggleViewAsMember`; no changes to `src/hooks/use-admin-mode.ts` or `src/lib/admin-mode.functions.ts`.
- Styling uses existing semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`), no hardcoded colors.
- Animations respect `prefers-reduced-motion`.
- `AdminPreviewTag` stays as-is so admin-preview labels on dashboard/centre keep working.

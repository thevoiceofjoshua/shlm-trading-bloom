# Move the admin dock to the bottom-left corner

Purely a position change. `src/components/AdminBar.tsx` renders the admin control dock and the minimized floating badge — both currently anchored to the right side (expanded: bottom-center on mobile / top-right on desktop; minimized badge: bottom-right on mobile, top-right on desktop). Everything moves to the bottom-left corner so it clears the Tawk chat bubble bottom-right.

## Where it lives

- Component: `src/components/AdminBar.tsx` (only file touched)
- No spacer/layout changes needed — the dock floats with no reserved space.

## Exact positioning changes

1. **Expanded dock container** (the outer wrapper of the pill):
   - Mobile: `fixed inset-x-0 bottom-0 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]`
     → `flex justify-start px-3 pb-[max(1rem,env(safe-area-inset-bottom))]` (pill hugs the left edge instead of centering)
   - Desktop (`sm:`): `inset-x-auto right-4 top-20 justify-end`
     → `left-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] justify-start` (moves from top-right to bottom-left)
2. **Minimized badge** (small floating chip shown when the dock is collapsed):
   - `bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 … sm:bottom-auto sm:top-20`
     → `left-4 … sm:top-auto` (bottom-left on every screen size)

## What does NOT change

- Component, functionality, role logic, links, visibility (`adminActive` gate only), size, styling, animations, and the `AdminPreviewTag` are untouched.
- Z-index, safe-area insets, and `motion-reduce` behavior stay exactly as they are.

## Role parity

- Member: no dock (unchanged). SHLM MOD and full admin both see the moved dock — same components, new corner for both.

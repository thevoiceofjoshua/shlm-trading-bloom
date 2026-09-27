# Tawk.to live chat widget

## Goal
Add the provided Tawk.to widget (property `6ab88397f3b8723446c758eb/1k3gc427b`) so it renders on every page of the site, bottom-right bubble, and the owner can reply from their phone. Purely additive.

## Where the script goes
This site is a React (TanStack Start) app — there is no `index.html` to edit. The right insertion point is the root layout, `src/routes/__root.tsx`, which wraps **every** page (homepage, blog, program, journal vault, admin, 404, etc.).

1. **New file `src/components/TawkChat.tsx`** — a tiny client-side loader component that injects your exact embed script (unchanged, verbatim) inside a `useEffect`, with a guard so it runs only once and never in server-side/prerender rendering.
2. **`src/routes/__root.tsx`** — render `<TawkChat />` once inside `RootComponent`, next to the existing `<AdminBar />`.

No other files are touched.

## Confirmations
- **Async / non-blocking:** The script itself sets `s1.async = true` and it is injected after the page has already rendered (post-hydration), so it cannot block or slow initial paint. Nothing waits on Tawk.
- **Conflicts:** Searched the codebase — no existing chat, support, or analytics widgets, and no `Tawk_API` usage. The site's highest z-index is `z-[100]` (the admin bar); Tawk renders at ~2,000,000,000, so it stays on top of everything without disturbing layout or styling.
  - One note: the AdminBar (visible only to the owner) sits bottom-right on desktop, near Tawk's default bubble. They can coexist; if it bothers you visually when signed in, we can nudge Tawk's bubble position later without touching anything else.
- **Every page:** Because the loader mounts in the root layout, the widget appears on all routes and survives route changes (Tawk itself is a single iframe that persists).
- **Default position:** No custom positioning is set, so Tawk's own default (bottom-right) applies, exactly as you want.

## Verification
- Load the site in the preview and confirm the chat bubble appears bottom-right.
- Check console/network to confirm the script loads once from `embed.tawk.to` with no errors.
- Confirm layout, vault boot screen, and existing pages render identically with the widget present.

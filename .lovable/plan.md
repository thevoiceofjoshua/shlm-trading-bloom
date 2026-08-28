# Fix the invisible favicon in search results

The favicon files in the project are a white "SHLM" wordmark on a **transparent** background. Google composites favicons onto a light circle, so white-on-transparent renders as an empty white disc — exactly what you're seeing. The tag and structured-data logo are wired correctly; the image itself is the problem.

## What changes

Replace the three icon files with versions that have a solid black background and the white SHLM mark on top, so the mark is visible on any surface:

- `public/favicon.png` (512x512)
- `public/favicon-32.png` (32x32, legible at tiny size — mark only, tighter crop)
- `public/apple-touch-icon.png` (180x180)

The 32px version gets slightly heavier letter weight and less padding, since a 4-letter wordmark disappears at that size otherwise.

Also add a `public/favicon.ico` fallback, because some crawlers and clients request `/favicon.ico` directly and ignore the `<link>` tags.

## Technical notes

- New icons are generated as a square black tile with the white SHLM wordmark, then downscaled with padding preserved (no stretching).
- `src/routes/__root.tsx` keeps its existing icon `links`; a `rel="icon"` entry for the `.ico` fallback is added.
- The Organization structured-data `logo` already points at `/favicon.png`, so it picks up the new image automatically.

## Timing

Google caches favicons aggressively — the white circle will persist in search results until it re-crawls the site, typically days. The browser tab and shared-link icon update as soon as this ships (hard-refresh to clear the local cache).

# Add the SHLM logo to search metadata

Right now the site's structured data tells Google the brand name and description, but never points at a logo image. The favicon files exist in `public/`, they're just not declared as the organization's logo — so Google has no logo to attach to the brand.

## What changes

- Declare the existing SHLM mark (`public/favicon.png`, 512x512) as the official organization logo in the site's structured data, using the full `https://shlmtrdng.com` URL.
- Keep the existing favicon/apple-touch links untouched — they already work.

## Technical detail

In `src/routes/__root.tsx`, extend the `Organization` node in the `@graph` JSON-LD with:

```
logo: {
  "@type": "ImageObject",
  url: `${SITE_URL}/favicon.png`,
  width: 512,
  height: 512,
},
image: `${SITE_URL}/favicon.png`,
```

No other route, tag, or page content changes.

## Note

Google caches what it last crawled, so the logo won't appear in search results immediately — it shows up after the next crawl of the site.

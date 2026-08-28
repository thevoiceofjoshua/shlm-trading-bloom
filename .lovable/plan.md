# Make the site rank for "shlmtrdng"

Right now the brand signals are split across two domains. The pages you serve at shlmtrdng.com tell Google their real address is `shlm-trading-bloom.lovable.app` — canonical tags, structured data, the sitemap, and robots.txt all point there. Google follows those and credits the lovable.app URL, so searches for "shlmtrdng" have a weak brand signal to attach to. On top of that, the word "shlmtrdng" appears nowhere in any page title, description, or on-page text, so there's nothing for Google to match the query against.

## What changes

1. Consolidate every URL signal on `https://shlmtrdng.com`
   - Homepage canonical (currently the lovable.app URL).
   - Legal page canonicals and og:url on `/privacy`, `/terms`, `/refund`.
   - Organization / WebSite structured data URLs and logo URL.
   - Sitemap base URL and the `Sitemap:` line in robots.txt.

2. Put the brand string into the metadata
   - Homepage title becomes `SHLM Trading — Trading Mentorship | shlmtrdng.com` (brand plus the searched term, under 60 chars).
   - Homepage description mentions SHLM Trading (shlmtrdng) once, naturally.
   - Add brand alternates to the Organization structured data: `alternateName: ["SHLM Trading", "shlmtrdng", "SHLM Trading Mentorship"]`, plus `sameAs` links to the Instagram and X accounts already used on the site — that's how Google associates a shorthand spelling with a brand entity.
   - Add a `WebSite` `SearchAction`-free `alternateName` entry so the sitename shown in results is SHLM Trading.

3. Add a light on-page brand mention
   - The footer already shows the brand; include "shlmtrdng.com" as visible text next to it so the term appears in the crawled body, not only in tags.

## Technical notes

- Files touched: `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/privacy.tsx`, `src/routes/terms.tsx`, `src/routes/refund.tsx`, `src/routes/sitemap[.]xml.ts`, `public/robots.txt`.
- No new routes, no design changes beyond the one footer line, no database work.
- Feature/blog routes keep their existing titles; they get self-referencing canonicals on shlmtrdng.com where missing.

## What this can and can't do

These are the on-page fixes fully under our control, and the canonical consolidation is the important one — without it Google has been told to ignore shlmtrdng.com. Ranking for a brand term also depends on Google re-crawling and on the domain accumulating a little external reference (your social profiles linking to shlmtrdng.com helps most). Expect days, not minutes, for search results to reflect it.

Optionally after this ships: verify shlmtrdng.com in Google Search Console and submit the sitemap so indexing is requested rather than waited on.

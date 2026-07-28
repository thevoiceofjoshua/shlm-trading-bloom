import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://shlm-trading-bloom.lovable.app/blog/breakout-strategy";
const TITLE = "The Breakout Strategy: A Trader's Guide to High-Probability Entries";
const DESCRIPTION =
  "Learn how the breakout strategy works — how to spot valid breakouts, filter false signals, and manage risk with the discipline SHLM teaches its mentorship cohort.";

export const Route = createFileRoute("/blog/breakout-strategy")({
  component: BreakoutStrategyPost,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "SHLM" },
          publisher: { "@type": "Organization", name: "SHLM" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
});

function BreakoutStrategyPost() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight">SHLM</Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Strategy guide</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          The Breakout Strategy: A Trader's Guide to High-Probability Entries
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">A field guide from the SHLM mentorship curriculum.</p>

        <div className="prose prose-neutral mt-10 max-w-none text-foreground [&_h2]:font-display [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_li]:mt-2">
          <p>
            The breakout strategy is one of the most reliable ways to catch expansion moves early —
            when price breaks a well-defined level of support, resistance, or consolidation and
            momentum takes over. At SHLM, the breakout is the backbone of the entire curriculum,
            because it forces traders to wait for structure, not feelings.
          </p>

          <h2>What is a breakout?</h2>
          <p>
            A breakout occurs when price closes decisively beyond a level that has held multiple
            times — a range high, a trendline, a prior day's high or low, or a consolidation
            pattern like a flag, wedge, or triangle. The key word is <em>decisively</em>: a wick
            through the level is not a breakout, and neither is a close that immediately reverses.
          </p>

          <h2>The three ingredients of a valid breakout</h2>
          <ul>
            <li>
              <strong>Clean structure.</strong> The level being broken should be obvious on the
              chart — tested at least twice, ideally three times. The more times price respects a
              level, the more meaningful the break.
            </li>
            <li>
              <strong>Contraction before expansion.</strong> The best breakouts come from tight
              consolidation. When range compresses and volatility drops, energy is building for the
              next expansion move.
            </li>
            <li>
              <strong>Momentum on the break.</strong> You want to see a strong-bodied candle, ideally
              with above-average volume, closing beyond the level. Weak, low-volume breaks are the
              ones that fail.
            </li>
          </ul>

          <h2>How to filter false breakouts</h2>
          <p>
            The biggest killer of breakout traders isn't losing — it's chasing fakeouts. Three
            filters cut most of them out:
          </p>
          <ul>
            <li>Wait for the candle to <strong>close</strong> beyond the level on your trading timeframe, not just tag it.</li>
            <li>Check the higher-timeframe trend. Breakouts in the direction of the daily trend have a much higher hit rate than counter-trend breaks.</li>
            <li>Avoid breakouts into major supply or demand zones sitting right above/below your level — price rarely runs cleanly into a wall.</li>
          </ul>

          <h2>Entry, stop, and target</h2>
          <p>
            SHLM traders use two standard entries for a breakout:
          </p>
          <ul>
            <li><strong>Breakout entry.</strong> Enter on the close of the breakout candle. Stop goes below the breakout candle's low (or above its high for shorts).</li>
            <li><strong>Retest entry.</strong> Wait for price to pull back to the broken level and reject. This gives a tighter stop and a better risk-to-reward, at the cost of sometimes missing the move entirely.</li>
          </ul>
          <p>
            Targets should be structural — the next range high, the next liquidity pocket, or a
            measured move equal to the height of the consolidation. Fixed R multiples (2R, 3R) are
            fine as guardrails, but never override obvious structure ahead of price.
          </p>

          <h2>Risk and psychology</h2>
          <p>
            No breakout works every time. What separates traders who compound from traders who
            blow up is consistent risk per trade — typically 0.5% to 1% of account equity — and the
            discipline to take the setup exactly as written, even after a loss. The strategy is
            simple. Executing it under pressure is not, which is why mentorship, journaling, and
            live review sessions are the real edge.
          </p>

          <h2>Where to go next</h2>
          <p>
            Inside the SHLM mentorship, we walk cohort members through breakout setups live each
            week, review your trades against the checklist above, and help you build the emotional
            infrastructure to trade the strategy without hesitation.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Ready to trade the breakout with a mentor?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Join the SHLM cohort and learn the full breakout system with weekly live sessions and 1:1 review.</p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create your account
          </Link>
        </div>
      </main>
    </div>
  );
}

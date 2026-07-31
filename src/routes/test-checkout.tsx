import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createTestCheckoutSession } from "@/lib/checkout.functions";
import { HomeButton } from "@/components/HomeButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/test-checkout")({
  component: TestCheckoutPage,
  head: () => ({
    meta: [
      { title: "Checkout Test — SHLM Trading" },
      {
        name: "description",
        content:
          "Internal $1 test product used to verify the SHLM Stripe checkout, receipt email and webhook flow.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Checkout Test — SHLM Trading" },
      {
        property: "og:description",
        content: "Internal $1 test product for verifying the SHLM checkout flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TestCheckoutPage() {
  const startCheckout = useServerFn(createTestCheckoutSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await startCheckout({ data: { origin: window.location.origin } });
      if (res?.url) window.location.href = res.url;
      else setError("No checkout URL returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-8">
        <HomeButton />
        <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Internal test
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">SHLM Test Product</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A $1.00 charge used to verify the full checkout flow: Stripe payment, webhook
            recording in the database, and the automated receipt email.
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold">$1</span>
            <span className="text-sm text-muted-foreground">one-time</span>
          </div>
          <Button
            onClick={handleClick}
            disabled={loading}
            className="w-full rounded-full h-12 text-base"
          >
            {loading ? "Opening Stripe…" : "Run test checkout"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </main>
  );
}

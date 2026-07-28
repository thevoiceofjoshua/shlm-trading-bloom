import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "./privacy";

export const Route = createFileRoute("/refund")({
  component: RefundPage,
  head: () => ({
    meta: [
      { title: "Refund Policy — SHLM" },
      { name: "description", content: "How refunds work for SHLM mentorship purchases and subscriptions." },
      { property: "og:title", content: "Refund Policy — SHLM" },
      { property: "og:description", content: "How refunds work for SHLM mentorship purchases and subscriptions." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/refund" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/refund" }],
  }),
});

function RefundPage() {
  return (
    <LegalShell title="Refund Policy" updated="July 28, 2026">
      <h2>Digital program</h2>
      <p>
        Because SHLM delivers digital educational content immediately upon purchase, all sales are
        generally final. We will consider refund requests on a case-by-case basis if made within
        7 days of purchase and before more than 20% of the program has been consumed.
      </p>
      <h2>Subscription cancellation</h2>
      <p>
        You may cancel a recurring subscription at any time from your dashboard. Cancellation stops
        future renewals; the current billing period is not prorated.
      </p>
      <h2>How to request a refund</h2>
      <p>Email support@shlmllc.com from the address on your account with your order details. We respond within 3 business days.</p>
      <h2>Chargebacks</h2>
      <p>Please contact us before initiating a chargeback so we can resolve the issue directly.</p>
    </LegalShell>
  );
}

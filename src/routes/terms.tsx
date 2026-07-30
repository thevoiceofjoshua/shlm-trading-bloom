import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "./privacy";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — SHLM" },
      { name: "description", content: "The terms that govern your use of SHLM's trading mentorship program." },
      { property: "og:title", content: "Terms of Service — SHLM" },
      { property: "og:description", content: "The terms that govern your use of SHLM's trading mentorship program." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/terms" }],
  }),
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 28, 2026">
      <h2>Educational purpose only</h2>
      <p>
        SHLM provides trading education and mentorship. Nothing on this site or in the program is
        financial, investment, tax, or legal advice. Trading involves substantial risk of loss.
        Past performance does not guarantee future results. You are solely responsible for your
        trading decisions.
      </p>
      <h2>Eligibility</h2>
      <p>You must be at least 18 years old and legally able to enter contracts in your jurisdiction to use SHLM.</p>
      <h2>Accounts</h2>
      <p>You are responsible for keeping your credentials secure and for all activity under your account.</p>
      <h2>License</h2>
      <p>We grant you a limited, non-transferable, non-exclusive license to access the program materials for your personal, non-commercial use. Redistribution, resale, or sharing of materials is prohibited.</p>
      <h2>Payments</h2>
      <p>Prices are shown at checkout. Subscriptions renew automatically until cancelled. Refunds are handled per our <a href="/refund" className="underline">Refund Policy</a>.</p>
      <h2>Termination</h2>
      <p>We may suspend or terminate access for breach of these terms, fraudulent activity, or abusive conduct.</p>
      <h2>Disclaimer</h2>
      <p>The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, SHLM is not liable for indirect, incidental, or consequential damages, including trading losses.</p>
      <h2>Contact</h2>
      <p>support@shlmtrdng.com</p>
    </LegalShell>
  );
}

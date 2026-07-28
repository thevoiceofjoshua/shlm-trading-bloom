import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeButton } from "@/components/HomeButton";


export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — SHLM" },
      { name: "description", content: "How SHLM collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — SHLM" },
      { property: "og:description", content: "How SHLM collects, uses, and protects your personal information." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 28, 2026">
      <p>
        SHLM LLC ("SHLM", "we", "us") respects your privacy. This policy explains what we collect,
        why, and the choices you have.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Account information you provide (name, email, password).</li>
        <li>Payment metadata handled by our payment processor. We never store full card numbers.</li>
        <li>Product usage data (pages viewed, lessons completed) to improve the program.</li>
      </ul>
      <h2>How we use information</h2>
      <ul>
        <li>Deliver and support the mentorship program.</li>
        <li>Process payments and prevent fraud.</li>
        <li>Send transactional and program-related communications.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We do not sell your data. We share it only with vendors that help us run the service (auth, hosting, payments) under confidentiality obligations.</p>
      <h2>Your rights</h2>
      <p>You may request access, correction, or deletion of your data by emailing support@shlmllc.com.</p>
      <h2>Contact</h2>
      <p>Questions? Email support@shlmllc.com.</p>
    </LegalShell>
  );
}

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight">SHLM</Link>
          <HomeButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="prose prose-neutral mt-10 max-w-none text-foreground [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_li]:mt-2">
          {children}
        </div>
      </main>
    </div>
  );
}

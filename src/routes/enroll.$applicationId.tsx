import { createFileRoute, redirect } from "@tanstack/react-router";

// Older invitation emails link here. Enrollment no longer requires signing in,
// so forward straight to the server route that opens Stripe Checkout.
export const Route = createFileRoute("/enroll/$applicationId")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/api/public/enroll/${params.applicationId}`, reloadDocument: true });
  },
  head: () => ({
    meta: [
      { title: "Continue to Checkout — SHLM Enrollment" },
      { name: "description", content: "Continue to secure Stripe checkout for your SHLM mentorship enrollment." },
      { property: "og:title", content: "Continue to Checkout — SHLM Enrollment" },
      { property: "og:description", content: "Continue to secure Stripe checkout for your SHLM mentorship enrollment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});

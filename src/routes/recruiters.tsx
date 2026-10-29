import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recruiters")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/affiliate-program${location.searchStr}${location.hash ? `#${location.hash}` : ""}`, replace: true });
  },
  head: () => ({ meta: [
    { title: "Affiliate Program — Legacy SHLM Link" },
    { name: "description", content: "The SHLM Recruiter Portal is now the Affiliate Program." },
    { property: "og:title", content: "Affiliate Program — SHLM" },
    { property: "og:description", content: "Your SHLM Affiliate Program, earnings and payouts." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});
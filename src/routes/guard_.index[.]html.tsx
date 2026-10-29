import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guard_/index.html")({
  beforeLoad: () => {
    throw redirect({ to: "/guard", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Open Session Guard — SHLM" },
      { name: "description", content: "Continue to your SHLM Session Guard." },
      { property: "og:title", content: "Open Session Guard — SHLM" },
      { property: "og:description", content: "Continue to your SHLM Session Guard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});
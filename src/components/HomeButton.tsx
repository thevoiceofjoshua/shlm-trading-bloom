import { Link } from "@tanstack/react-router";

export function HomeButton() {
  return (
    <Link
      to="/"
      className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      ← Back to home
    </Link>
  );
}

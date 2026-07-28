import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function HomeButton() {
  return (
    <Link
      to="/"
      aria-label="Back to home"
      className="inline-flex items-center justify-center rounded-full border border-border bg-background p-2.5 text-foreground transition-colors hover:bg-accent"
    >
      <Home size={18} strokeWidth={1.5} />
    </Link>
  );
}

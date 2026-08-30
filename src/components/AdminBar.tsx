import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAdminMode } from "@/hooks/use-admin-mode";

const fullLinks = [
  { label: "Applications", href: "/admin" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "SHLM Centre", href: "/centre" },
  { label: "Test checkout", href: "/test-checkout" },
  { label: "Storefront", href: "/" },
];

const modLinks = [
  { label: "SHLM Centre", href: "/centre" },
  { label: "Storefront", href: "/" },
];

const MIN_KEY = "shlm.adminDockMinimized";

export function AdminBar() {
  const { adminActive, modOnly, viewAsMember, email, exit, toggleViewAsMember } = useAdminMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [minimized, setMinimized] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMinimized(window.sessionStorage.getItem(MIN_KEY) === "1");
  }, []);

  const setMin = (next: boolean) => {
    setMinimized(next);
    setDetails(false);
    if (typeof window !== "undefined") window.sessionStorage.setItem(MIN_KEY, next ? "1" : "0");
  };

  if (!adminActive) return null;

  const links = modOnly ? modLinks : fullLinks;
  const label = modOnly ? "SHLM MOD" : viewAsMember ? "Member view" : "Admin mode";

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(false)}
        aria-label="Show admin controls"
        className="fixed bottom-5 right-4 z-[100] flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2.5 text-xs font-medium text-foreground shadow-xl backdrop-blur-xl transition-[transform,opacity] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none sm:bottom-auto sm:top-4"
      >
        <span className="size-1.5 rounded-full bg-primary" />
        {label}
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-4 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:justify-end sm:px-0 sm:pb-0">
      <div className="pointer-events-auto w-full max-w-[560px] animate-in fade-in rounded-[26px] border border-border bg-card/85 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 motion-reduce:transition-none sm:w-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDetails((v) => !v)}
            aria-expanded={details}
            className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <span
              className={
                "size-1.5 rounded-full " +
                (viewAsMember && !modOnly ? "bg-muted-foreground" : "bg-primary")
              }
            />
            {label}
          </button>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  to={l.href}
                  className={
                    "shrink-0 rounded-full px-3 py-2 text-xs transition-colors " +
                    (active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setMin(true)}
            aria-label="Minimize admin controls"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span aria-hidden className="block h-px w-3.5 bg-current" />
          </button>
        </div>

        {details && (
          <div className="mt-2 space-y-3 rounded-[18px] border border-border bg-background/60 p-3">
            <div className="space-y-0.5">
              {email && <p className="truncate text-xs text-foreground">{email}</p>}
              <p className="truncate text-[11px] text-muted-foreground">{pathname}</p>
            </div>

            {!modOnly && (
              <button
                type="button"
                onClick={toggleViewAsMember}
                role="switch"
                aria-checked={viewAsMember}
                className="flex w-full items-center justify-between gap-3 rounded-full border border-border px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent"
              >
                <span>View as member</span>
                <span
                  className={
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors " +
                    (viewAsMember ? "bg-primary" : "bg-muted")
                  }
                >
                  <span
                    className={
                      "absolute top-0.5 size-4 rounded-full bg-background transition-all duration-200 motion-reduce:transition-none " +
                      (viewAsMember ? "left-[18px]" : "left-0.5")
                    }
                  />
                </span>
              </button>
            )}

            {modOnly && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Read-only access — program settings and member data stay locked.
              </p>
            )}

            <button
              type="button"
              onClick={exit}
              className="w-full rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Exit {modOnly ? "SHLM MOD" : "admin mode"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminPreviewTag({ label = "Admin preview" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </span>
  );
}

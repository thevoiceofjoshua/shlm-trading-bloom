import { useRouterState } from "@tanstack/react-router";
import { useAdminMode } from "@/hooks/use-admin-mode";

const links = [
  { label: "Applications", href: "/admin" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "SHLM Centre", href: "/centre" },
  { label: "Test checkout", href: "/test-checkout" },
  { label: "Storefront", href: "/" },
];

export function AdminBar() {
  const { adminActive, viewAsMember, email, exit, toggleViewAsMember } = useAdminMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!adminActive) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-black/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-5">
          <span
            className={
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] " +
              (viewAsMember ? "bg-white/15 text-white/70" : "bg-white text-black")
            }
          >
            {viewAsMember ? "Member view" : "Admin mode"}
          </span>

          <span className="hidden text-[11px] text-white/60 sm:inline">{email}</span>
          <span className="text-[11px] text-white/40">{pathname}</span>

          <nav className="flex flex-1 flex-wrap items-center gap-1.5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleViewAsMember}
              className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/10"
            >
              {viewAsMember ? "Back to admin view" : "View as member"}
            </button>
            <button
              type="button"
              onClick={exit}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black transition-opacity hover:opacity-90"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
      {/* Spacer so the bar never covers page chrome */}
      <div aria-hidden className="h-[46px] sm:h-[42px]" />
    </>
  );
}

export function AdminPreviewTag({ label = "Admin preview" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </span>
  );
}

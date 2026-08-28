import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { AuthUser } from "@/hooks/use-auth-user";

export function AccountMenu({
  user,
  scrolled,
  variant = "desktop",
}: {
  user: AuthUser;
  scrolled: boolean;
  variant?: "desktop" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  };

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-3">
        <div
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-full border px-4 text-sm font-semibold",
            scrolled
              ? "border-border bg-background text-foreground"
              : "border-white/20 bg-white/10 text-white",
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
            {user.initials}
          </span>
          <span>Hi, {user.firstName}</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors",
            scrolled
              ? "border-border text-foreground hover:bg-accent"
              : "border-white/20 text-white hover:bg-white/10",
          )}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 rounded-full border px-2 py-1.5 pr-3.5 text-sm font-medium transition-colors",
          scrolled
            ? "border-border bg-background text-foreground hover:bg-accent"
            : "border-white/20 bg-white/10 text-white hover:bg-white/20",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
            scrolled ? "bg-foreground text-background" : "bg-white text-foreground",
          )}
        >
          {user.initials}
        </span>
        <span className="hidden sm:inline">Hi, {user.firstName}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Hi, {user.firstName}</p>
            {user.email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
          <a
            href="/dashboard"
            className="flex items-center px-4 py-2.5 text-sm hover:bg-accent"
            role="menuitem"
          >
            Dashboard
          </a>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (adminMode) exit();
                else reopenPrompt();
              }}
              className="flex w-full items-center border-t border-border px-4 py-2.5 text-left text-sm hover:bg-accent"
              role="menuitem"
            >
              {adminMode ? "Exit admin mode" : "Enter admin mode"}
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center border-t border-border px-4 py-2.5 text-left text-sm hover:bg-accent"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

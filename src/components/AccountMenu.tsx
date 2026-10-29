import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { AuthUser } from "@/hooks/use-auth-user";
import { useAdminMode } from "@/hooks/use-admin-mode";
import { useRecruiterAccess } from "@/hooks/use-recruiter-access";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { signOutAccount } from "@/lib/account-session";

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
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { isStaff, modOnly, adminMode, exit, reopenPrompt } = useAdminMode();
  const { allowed: showRecruiters, error: recruiterError } = useRecruiterAccess(user.id);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOutAccount(supabase.auth, queryClient, window.sessionStorage);
      setOpen(false);
      await navigate({ to: "/auth", replace: true });
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
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
        <a
          href="/dashboard"
          className={cn(
            "flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors",
            scrolled
              ? "border-border text-foreground hover:bg-accent"
              : "border-white/20 text-white hover:bg-white/10",
          )}
        >
          Dashboard
        </a>
        {showRecruiters && (
          <a
            href="/affiliate-program"
            className={cn(
              "flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors",
              scrolled
                ? "border-border text-foreground hover:bg-accent"
                : "border-white/20 text-white hover:bg-white/10",
            )}
          >
            Affiliate Program
          </a>
        )}
        <a href="/bible-study" className="flex min-h-12 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent">Bible Study</a>
        {!showRecruiters && recruiterError && (
          <p className="break-words rounded-2xl border border-destructive/40 px-4 py-2 text-xs text-destructive">
            Affiliate check failed: {recruiterError}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={signingOut}
          onClick={handleSignOut}
          className={cn(
            "flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors",
            scrolled
              ? "border-border text-foreground hover:bg-accent"
              : "border-white/20 text-white hover:bg-white/10",
          )}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
        {signOutError && <p role="alert" className="px-4 text-xs text-destructive">{signOutError}</p>}
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
          {showRecruiters && (
            <a
              href="/affiliate-program"
              className="flex items-center border-t border-border px-4 py-2.5 text-sm hover:bg-accent"
              role="menuitem"
            >
              Affiliate Program
            </a>
          )}
          {isStaff && (
            <a href="/bible-study" className="flex items-center border-t border-border px-4 py-2.5 text-sm hover:bg-accent" role="menuitem">Bible Study</a>
          )}
          {!isStaff && <a href="/bible-study" className="flex items-center border-t border-border px-4 py-2.5 text-sm hover:bg-accent" role="menuitem">Bible Study</a>}
          {isStaff && (
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
              {adminMode ? (modOnly ? "Exit SHLM MOD" : "Exit SHLM Founder") : (modOnly ? "Enter SHLM MOD" : "Enter SHLM Founder")}
            </button>
          )}

          <Button
            type="button"
            variant="ghost"
            disabled={signingOut}
            onClick={handleSignOut}
            className="flex h-auto w-full justify-start rounded-none border-t border-border px-4 py-2.5 text-left text-sm hover:bg-accent"
            role="menuitem"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
          {signOutError && <p role="alert" className="px-4 py-2 text-xs text-destructive">{signOutError}</p>}
        </div>
      )}
    </div>
  );
}

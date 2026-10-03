import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getRecruiterAccess } from "@/lib/recruiters.functions";

/**
 * Whether to show the Recruiter Portal link (Founder or recruiter).
 * This only controls the link — the portal itself is enforced server-side.
 *
 * Two independent checks run; either one succeeding shows the link:
 *  1. direct read of the user's own roles (RLS: users can view their own roles)
 *  2. the server function check
 * Re-runs when the session refreshes or the tab becomes visible again, because
 * mobile Safari often resumes with an expired token and the first call fails.
 * `error` is set only when every check failed (temporary diagnostic).
 */
export function useRecruiterAccess(userId: string | null | undefined) {
  const fetchAccess = useServerFn(getRecruiterAccess);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setAllowed(false);
      setError(null);
      return;
    }
    let active = true;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const msg = (e: unknown) =>
      e instanceof Error ? e.message : typeof e === "string" ? e : (() => { try { return JSON.stringify(e); } catch { return String(e); } })();

    const run = async (attempt: number) => {
      if (!active || done) return;
      const errors: string[] = [];

      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        if (error) throw new Error(error.message);
        const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
        if (!active) return;
        if (roles.includes("admin") || roles.includes("recruiter")) {
          done = true;
          setAllowed(true);
          setError(null);
          return;
        }
      } catch (e) {
        errors.push(`roles: ${msg(e)}`);
      }

      try {
        const r = await fetchAccess();
        if (!active) return;
        if (r.role) {
          done = true;
          setAllowed(true);
          setError(null);
          return;
        }
        // Server answered: genuinely not a recruiter/Founder.
        if (errors.length === 0) {
          setAllowed(false);
          setError(null);
          return;
        }
      } catch (e) {
        errors.push(`server: ${msg(e)}`);
      }

      if (!active) return;
      if (errors.length) {
        console.warn("[recruiter-access] check failed", { attempt, errors });
        if (attempt < 4) timer = setTimeout(() => run(attempt + 1), 1500 * (attempt + 1));
        else setError(errors.join(" | "));
      }
    };

    run(0);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        clearTimeout(timer);
        run(0);
      }
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && !done) {
        clearTimeout(timer);
        run(0);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    return () => {
      active = false;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [userId, fetchAccess]);

  return { allowed, error };
}

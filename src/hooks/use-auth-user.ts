import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  initials: string;
  firstName: string;
};

function deriveUser(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUser {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && (meta.name as string)) ||
    null;
  const email = u.email ?? null;
  const display = fullName ?? (email ? email.split("@")[0] : "there");
  const firstName = display.split(/[\s._-]+/).filter(Boolean)[0] ?? display;
  const parts = display.split(/[\s._-]+/).filter(Boolean);
  const initials =
    (parts[0]?.[0] ?? "").toUpperCase() +
    (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "").toUpperCase() : "");
  return {
    id: u.id,
    email,
    name: fullName,
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    initials: initials || (email?.[0]?.toUpperCase() ?? "U"),
  };
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ? deriveUser(data.session.user) : null);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? deriveUser(session.user) : null);
      setLoaded(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loaded };
}

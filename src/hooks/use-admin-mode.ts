import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminPasscode } from "@/lib/admin-mode.functions";

const MODE_KEY = "shlm.adminMode";
const PASS_KEY = "shlm.adminPasscode";
const VIEW_KEY = "shlm.adminViewAsMember";
const DECIDED_KEY = "shlm.adminModeDecided";
const EVENT = "shlm:admin-mode";

type AdminState = {
  adminMode: boolean;
  viewAsMember: boolean;
  passcode: string;
  decided: boolean;
};

function read(): AdminState {
  if (typeof window === "undefined") {
    return { adminMode: false, viewAsMember: false, passcode: "", decided: false };
  }
  const ss = window.sessionStorage;
  return {
    adminMode: ss.getItem(MODE_KEY) === "1",
    viewAsMember: ss.getItem(VIEW_KEY) === "1",
    passcode: ss.getItem(PASS_KEY) ?? "",
    decided: ss.getItem(DECIDED_KEY) === "1",
  };
}

function write(patch: Partial<AdminState>) {
  if (typeof window === "undefined") return;
  const ss = window.sessionStorage;
  if (patch.adminMode !== undefined) ss.setItem(MODE_KEY, patch.adminMode ? "1" : "0");
  if (patch.viewAsMember !== undefined) ss.setItem(VIEW_KEY, patch.viewAsMember ? "1" : "0");
  if (patch.passcode !== undefined) {
    if (patch.passcode) ss.setItem(PASS_KEY, patch.passcode);
    else ss.removeItem(PASS_KEY);
  }
  if (patch.decided !== undefined) ss.setItem(DECIDED_KEY, patch.decided ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Admin mode is a convenience layer only. The browser flag never unlocks data
 * on its own — every gated server function re-checks `has_role` on the server.
 */
export function useAdminMode() {
  const [state, setState] = useState<AdminState>(() => read());
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setState(read());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  useEffect(() => {
    let active = true;

    const check = async (userId: string | null, userEmail: string | null) => {
      if (!userId) {
        if (!active) return;
        setIsAdmin(false);
        setEmail(null);
        setChecked(true);
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!active) return;
      setIsAdmin(data === true);
      setEmail(userEmail);
      setChecked(true);
    };

    supabase.auth.getSession().then(({ data }) => {
      void check(data.session?.user.id ?? null, data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        write({ adminMode: false, viewAsMember: false, passcode: "", decided: false });
      }
      void check(session?.user.id ?? null, session?.user.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const enter = useCallback(async (passcode: string) => {
    const res = await verifyAdminPasscode({ data: { passcode } });
    if (!res.ok) return res;
    write({ adminMode: true, viewAsMember: false, passcode, decided: true });
    return res;
  }, []);

  const exit = useCallback(() => {
    write({ adminMode: false, viewAsMember: false, passcode: "", decided: true });
  }, []);

  const dismissPrompt = useCallback(() => {
    write({ decided: true });
  }, []);

  /** Re-opens the "Enter admin mode?" dialog (used from the account menu). */
  const reopenPrompt = useCallback(() => {
    write({ decided: false });
  }, []);

  const toggleViewAsMember = useCallback(() => {
    write({ viewAsMember: !read().viewAsMember });
  }, []);

  const active = isAdmin && state.adminMode;

  return {
    isAdmin,
    checked,
    email,
    adminMode: state.adminMode,
    viewAsMember: state.viewAsMember,
    passcode: state.passcode,
    decided: state.decided,
    /** Admin unlocks apply (admin, admin mode on, not viewing as member). */
    adminUnlocked: active && !state.viewAsMember,
    /** Admin bar visible. */
    adminActive: active,
    enter,
    exit,
    dismissPrompt,
    toggleViewAsMember,
  };
}

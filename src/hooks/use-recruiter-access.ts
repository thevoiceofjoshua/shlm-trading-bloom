import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRecruiterAccess } from "@/lib/recruiters.functions";

/** True when the signed-in user is a recruiter or the Founder. */
export function useRecruiterAccess(userId: string | null | undefined) {
  const fetchAccess = useServerFn(getRecruiterAccess);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!userId) {
      setAllowed(false);
      return;
    }
    let active = true;
    // A single dropped request must not hide the menu link for the whole
    // session — retry a couple of times before giving up.
    const attempt = (n: number) => {
      fetchAccess()
        .then((r) => active && setAllowed(!!r.role))
        .catch(() => {
          if (!active) return;
          if (n < 2) setTimeout(() => active && attempt(n + 1), 1500);
        });
    };
    attempt(0);
    return () => {
      active = false;
    };
  }, [userId, fetchAccess]);
  return allowed;
}

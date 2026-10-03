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
    fetchAccess()
      .then((r) => active && setAllowed(!!r.role))
      .catch(() => active && setAllowed(false));
    return () => {
      active = false;
    };
  }, [userId, fetchAccess]);
  return allowed;
}

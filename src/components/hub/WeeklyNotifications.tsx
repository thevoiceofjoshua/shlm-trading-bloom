import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayActivity } from "@/lib/weekly-activity.functions";

function useActivity(enabled: boolean) {
  const fetchActivity = useServerFn(getTodayActivity);
  return useQuery({
    queryKey: ["weekly-activity"],
    queryFn: () => fetchActivity(),
    enabled,
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function useBanner(enabled: boolean) {
  const { data } = useActivity(enabled);
  const [banner, setBanner] = useState<{ message: string; count: number } | null>(null);
  useEffect(() => {
    if (!enabled) {
      setBanner(null);
      return;
    }
    if (!data?.sessionDate) return;
    const key = `shlm-weekly-activity-seen:${data.sessionDate}`;
    const newest = data.events[0];
    if (!newest) return;
    const seen = localStorage.getItem(key);
    if (seen === newest.id) return;
    const seenIndex = seen ? data.events.findIndex((event) => event.id === seen) : -1;
    const count = seenIndex < 0 ? data.events.length : seenIndex;
    localStorage.setItem(key, newest.id);
    if (count) setBanner({ message: newest.message, count });
  }, [data, enabled]);
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 10_000);
    return () => window.clearTimeout(id);
  }, [banner]);
  return { banner, dismiss: () => setBanner(null) };
}

export function WeeklyNotificationBanner({ enabled }: { enabled: boolean }) {
  const { banner, dismiss } = useBanner(enabled);
  if (!enabled || !banner) return null;
  return (
    <div role="status" className="mb-5 flex min-h-11 items-center gap-3 border-l-2 border-foreground bg-surface px-4 py-2 text-sm text-foreground">
      <span className="min-w-0 flex-1 truncate">{banner.message}{banner.count > 1 ? ` · +${banner.count - 1} more` : ""}</span>
      <Button variant="ghost" size="icon" aria-label="Dismiss notification" title="Dismiss notification" onClick={dismiss} className="h-8 w-8 shrink-0"><X /></Button>
    </div>
  );
}

export function WeeklyNotificationCenter({ enabled }: { enabled: boolean }) {
  const { data, isError } = useActivity(enabled);
  if (!enabled) return null;
  return (
    <section aria-labelledby="weekly-notification-title" className="mt-8 border-t border-border pt-6">
      <h2 id="weekly-notification-title" className="font-display text-lg font-medium">Notification Center</h2>
      <div className="mt-3 max-h-60 overflow-y-auto border-y border-border">
        {isError ? <p className="py-4 text-sm text-muted-foreground">Notifications unavailable right now.</p>
          : !data?.events.length ? <p className="py-4 text-sm text-muted-foreground">No activity yet today.</p>
          : data.events.map((event) => (
            <div key={event.id} className="flex gap-4 border-b border-border py-3 text-sm last:border-b-0">
              <time dateTime={event.created_at} className="w-20 shrink-0 text-xs text-muted-foreground">
                {new Date(event.created_at).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })}
              </time>
              <span>{event.message}</span>
            </div>
          ))}
      </div>
    </section>
  );
}
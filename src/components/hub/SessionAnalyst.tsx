import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { runSessionReview, type SessionReview } from "@/lib/hub.functions";
import type { HubPayload } from "@/lib/hub.functions";

export function SessionAnalyst({ payload }: { payload: HubPayload }) {
  const [review, setReview] = useState<SessionReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReview = useServerFn(runSessionReview);

  const run = useMutation({
    mutationFn: () => runReview({ data: undefined }),
    onSuccess: (data) => {
      setReview(data);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const dataLabel = (payload.dataState as string) === "live" ? "Live data" : "Sample data";

  return (
    <div className="rounded-2xl border border-foreground/20 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-medium tracking-tight">SHLM Analyst</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            AI session review — reads every panel and flags the zero-volume and high-volume open calls.
          </p>
        </div>
        <button
          type="button"
          disabled={run.isPending}
          onClick={() => run.mutate()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {run.isPending ? "Analyzing…" : review ? "Re-run review" : "Run session review"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {review && (
        <div className="mt-5 space-y-5">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Session review</p>
            {review.sessions.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-semibold">{s.window}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pairs: {s.pairs}</p>
                <p className="mt-2 text-sm">{s.review}</p>
                {s.levels && <p className="mt-1.5 text-xs text-muted-foreground">Levels: {s.levels}</p>}
                {s.releases && <p className="mt-1 text-xs text-muted-foreground">Releases: {s.releases}</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Most likely zero volume at open</p>
              <p className="mt-1 font-display text-lg font-medium">{review.zeroVolumePair.pair}</p>
              <p className="mt-1 text-xs text-muted-foreground">{review.zeroVolumePair.reason}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Most likely highest volume today</p>
              <p className="mt-1 font-display text-lg font-medium">{review.highVolumePair.pair}</p>
              <p className="mt-1 text-xs text-muted-foreground">{review.highVolumePair.reason}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Generated {new Date(review.generatedAt).toLocaleString()} · {dataLabel}
          </p>
        </div>
      )}
    </div>
  );
}

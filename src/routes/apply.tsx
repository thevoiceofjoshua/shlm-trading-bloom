import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { submitApplication } from "@/lib/applications.functions";

const searchSchema = z.object({
  tier: z.enum(["foundation", "mentorship", "elite"]).optional(),
});

export const Route = createFileRoute("/apply")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ApplyPage,
  head: () => ({
    meta: [
      { title: "Apply to SHLM Mentorship — Book Your Call" },
      { name: "description", content: "Apply to SHLM's breakout-strategy mentorship. Submit your application and book a discovery call with Joshua." },
      { property: "og:title", content: "Apply to SHLM Mentorship — Book Your Call" },
      { property: "og:description", content: "Apply to SHLM's breakout-strategy mentorship. Submit your application and book a discovery call with Joshua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ApplyPage() {
  const { tier } = useSearch({ from: "/apply" });
  const submit = useServerFn(submitApplication);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { timezone: string; scheduledAtLocal: string; scheduledAtLA: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const guessTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Los_Angeles";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submit({
        data: {
          tier: (fd.get("tier") as any) || tier || "mentorship",
          fullName: String(fd.get("fullName") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          experience: String(fd.get("experience") || ""),
          goals: String(fd.get("goals") || ""),
          scheduledAt: String(fd.get("scheduledAt") || ""),
          timezone: String(fd.get("timezone") || guessTz),
        },
      });
      setDone({
        timezone: result.timezone,
        scheduledAtLocal: result.scheduledAtLocal,
        scheduledAtLA: result.scheduledAtLA,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen bg-background px-4 py-24">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-10 text-center">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Application received</h1>
          <p className="mt-4 text-muted-foreground">
            Thanks — your application is in. Joshua will reach out to confirm your discovery call at the time you selected.
          </p>
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-left">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your timezone</p>
            <p className="mt-1 text-base font-medium text-foreground">{done.timezone}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">Your local time</p>
            <p className="mt-1 text-base font-medium text-foreground">{done.scheduledAtLocal}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">Joshua's time (LA)</p>
            <p className="mt-1 text-base font-medium text-foreground">{done.scheduledAtLA}</p>
          </div>
          <Link
            to="/"
            className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center sm:mb-10">
          <p className="font-display text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground sm:text-sm sm:tracking-widest">Enrollment</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">Apply to SHLM</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Fill out your application and book your discovery call. Joshua reviews every submission personally.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-8">
          <div>
            <label className="block text-sm font-medium text-foreground">Tier</label>
            <select
              name="tier"
              defaultValue={tier || "mentorship"}
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="foundation">Foundation — $499</option>
              <option value="mentorship">Mentorship — $1,499</option>
              <option value="elite">Elite — $2,999</option>
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="fullName" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Phone" name="phone" type="tel" />
            <Field label="Timezone" name="timezone" defaultValue={guessTz} />
          </div>

          <TextArea label="Trading experience" name="experience" placeholder="How long have you traded and what markets?" />
          <TextArea label="Your goals" name="goals" placeholder="What do you want to accomplish in the next 12 weeks?" />

          <Field label="Preferred call date & time" name="scheduledAt" type="datetime-local" required />

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            By submitting, you agree to be contacted by Joshua about your application.
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <textarea
        name={name}
        rows={4}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

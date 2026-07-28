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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guessTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Los_Angeles";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await submit({
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
      setDone(true);
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
    <main className="min-h-screen bg-background px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Enrollment</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground">Apply to SHLM</h1>
          <p className="mt-4 text-muted-foreground">
            Fill out your application and book your discovery call. Joshua reviews every submission personally.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div>
            <label className="block text-sm font-medium text-foreground">Tier</label>
            <select
              name="tier"
              defaultValue={tier || "mentorship"}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
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

          <div className="grid gap-5 sm:grid-cols-1">
            <Field label="Preferred call date & time" name="scheduledAt" type="datetime-local" required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-6 py-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
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
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
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
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
      />
    </div>
  );
}

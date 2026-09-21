import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { HomeButton } from "@/components/HomeButton";
import { Button } from "@/components/ui/button";
import { VaultCredentialFrame, VaultDivider, VaultField } from "@/components/VaultCredentialFrame";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — SHLM" },
      { name: "description", content: "Sign in to your SHLM account or create a new one to join the mentorship program." },
      { property: "og:title", content: "Sign in or create an account — SHLM" },
      { property: "og:description", content: "Sign in to your SHLM account or create a new one to join the mentorship program." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/auth" }],
  }),
});

function AuthPage() {
  const { mode: initialMode, redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/", replace: true });
    });
  }, [navigate, redirect]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: name ? { full_name: name } : undefined,
          },
        });
        if (error) throw error;
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirect ?? "/", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    // Native Supabase OAuth (not the Lovable-hosting-only ~oauth/initiate wrapper),
    // so this works regardless of which frontend deployment serves the request.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirect ? `${window.location.origin}${redirect}` : window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
    }
    // On success, Supabase redirects the browser to Google automatically; nothing else to do here.
  };

  const isSignup = mode === "signup";

  return (
    <div className="vault-boot min-h-dvh w-full max-w-full overflow-x-clip bg-[var(--vault-bg)] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-[var(--vault-ink)] xs:px-4 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto min-w-0 max-w-md">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="font-mono text-sm font-semibold uppercase tracking-[0.24em] text-[var(--vault-ink)]">
            SHLM
          </Link>
          <HomeButton />
        </div>

        <VaultCredentialFrame className="mt-5 sm:mt-8" status={isSignup ? "register" : "locked"}>
          <div className="grid grid-cols-2 border border-[var(--vault-line)] p-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setMode("signin"); setError(null); setNotice(null); }}
              className={`rounded-sm ${
                !isSignup ? "bg-[var(--vault-ink)] text-[var(--vault-bg)] hover:bg-[var(--vault-ink)]" : "text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"
              }`}
            >
              Sign in
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setMode("signup"); setError(null); setNotice(null); }}
              className={`rounded-sm ${
                isSignup ? "bg-[var(--vault-ink)] text-[var(--vault-bg)] hover:bg-[var(--vault-ink)]" : "text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"
              }`}
            >
              Create account
            </Button>
          </div>

          <p className="mt-7 text-[10px] uppercase tracking-[0.28em] text-[var(--vault-accent)]">{isSignup ? "New operator registration" : "Operator authentication"}</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-normal text-[var(--vault-ink)]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 font-sans text-sm text-[var(--vault-muted)]">
            {isSignup
              ? "Join SHLM and start building your trading edge."
              : "Sign in to continue your SHLM mentorship."}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="mt-6 h-11 w-full rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-ink)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"
          >
            <GoogleIcon />
            Continue with Google
          </Button>


          <div className="my-6"><VaultDivider /></div>

          <form onSubmit={handleEmail} className="space-y-4">
            {isSignup && (
              <VaultField
                  label="Full name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
            )}
            <VaultField
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            <div>
              <VaultField
                label="Password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              {isSignup && (
                <p className="mt-1 font-sans text-xs text-[var(--vault-muted)]">At least 8 characters.</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-[var(--vault-accent)]">{notice}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-sm bg-[var(--vault-ink)] text-[var(--vault-bg)] hover:bg-[var(--vault-muted)]"
            >
              {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center font-sans text-sm text-[var(--vault-muted)]">
            {isSignup ? "Already have an account?" : "New to SHLM?"}{" "}
            <Button
              type="button"
              variant="link"
              onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(null); setNotice(null); }}
              className="h-auto p-0 text-[var(--vault-ink)]"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Button>
          </p>
        </VaultCredentialFrame>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="grayscale">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

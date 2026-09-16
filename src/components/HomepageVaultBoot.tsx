import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup";
type Phase = "booting" | "ready" | "opening";

const BOOT_LINES = [
  "> SHLM SECURE TERMINAL v2.6",
  "> market systems ........ online",
  "> encrypted channel ..... established",
  "> identity gateway ...... ready",
];

export function HomepageVaultBoot({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [phase, setPhase] = useState<Phase>("booting");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [returningUser, setReturningUser] = useState(false);

  useEffect(() => {
    let active = true;
    const minimumBoot = window.setTimeout(() => {
      if (active) setPhase((current) => (current === "booting" ? "ready" : current));
    }, 900);

    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      setReturningUser(true);
      window.setTimeout(() => {
        if (active) setPhase("opening");
      }, 700);
    });

    return () => {
      active = false;
      window.clearTimeout(minimumBoot);
    };
  }, []);

  useEffect(() => {
    if (phase !== "opening") return;
    const timer = window.setTimeout(onComplete, 1250);
    return () => window.clearTimeout(timer);
  }, [onComplete, phase]);

  const openHomepage = () => {
    setError(null);
    setNotice(null);
    setPhase("opening");
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: name ? { full_name: name } : undefined,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setReturningUser(true);
          openHomepage();
          return;
        }
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setReturningUser(true);
        openHomepage();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";
  const isOpening = phase === "opening";

  return (
    <main className="vault-boot relative min-h-svh overflow-hidden bg-[var(--vault-bg)] font-mono text-[var(--vault-green)]">
      <style>{`
        .vault-boot { --vault-bg: oklch(0.075 0.012 155); --vault-green: oklch(0.79 0.19 155); --vault-green-soft: oklch(0.68 0.13 155); --vault-amber: oklch(0.78 0.15 75); --vault-panel: oklch(0.11 0.018 155 / .92); --vault-line: oklch(0.62 0.15 155 / .3); }
        .vault-boot::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 20; background: repeating-linear-gradient(180deg, color-mix(in oklch, var(--vault-green) 6%, transparent) 0 1px, transparent 1px 4px); }
        .vault-boot::after { content: ""; position: fixed; left: 0; right: 0; height: 24%; pointer-events: none; z-index: 20; opacity: .24; background: linear-gradient(180deg, transparent, color-mix(in oklch, var(--vault-green) 18%, transparent), transparent); animation: home-vault-scan 4.5s linear infinite; }
        @keyframes home-vault-scan { from { top: -24%; } to { top: 100%; } }
        @keyframes home-vault-spin { to { transform: rotate(360deg); } }
        @keyframes home-vault-pulse { 0%, 100% { opacity: .45; transform: scale(.94); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes home-vault-line { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes home-vault-left { to { transform: translateX(-102%); } }
        @keyframes home-vault-right { to { transform: translateX(102%); } }
        .home-vault-logo { animation: home-vault-spin 5s linear infinite; }
        .home-vault-pulse { animation: home-vault-pulse 1.25s ease-in-out infinite; }
        .home-vault-line { animation: home-vault-line .35s ease-out both; }
        .home-vault-door-left { animation: home-vault-left .9s cubic-bezier(.7,0,.2,1) .28s forwards; }
        .home-vault-door-right { animation: home-vault-right .9s cubic-bezier(.7,0,.2,1) .28s forwards; }
        @media (prefers-reduced-motion: reduce) { .vault-boot::after, .home-vault-logo, .home-vault-pulse, .home-vault-line, .home-vault-door-left, .home-vault-door-right { animation-duration: .01ms; animation-iteration-count: 1; } }
      `}</style>

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-16">
          <section aria-label="SHLM secure terminal" className="mx-auto w-full max-w-xl lg:mx-0">
            <div className="flex items-center justify-between border-b border-[var(--vault-line)] pb-3 text-[10px] uppercase tracking-[0.28em] text-[var(--vault-green-soft)]">
              <span>SHLM // secure access</span>
              <span className="text-[var(--vault-amber)]">{isOpening ? "unsealing" : phase}</span>
            </div>

            <div className="mt-8 flex items-center gap-6 sm:gap-8">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center sm:h-32 sm:w-32">
                <div className="home-vault-pulse absolute inset-0 rounded-full border border-[var(--vault-green)] opacity-40" />
                <div className="home-vault-logo relative grid h-20 w-20 place-items-center rounded-full border border-[var(--vault-line)] bg-[var(--vault-panel)] p-3 sm:h-28 sm:w-28 sm:p-4">
                  <img src="/favicon.png" alt="SHLM" className="h-full w-full rounded-full object-contain" width={512} height={512} />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--vault-amber)]">Private trading network</p>
                <h1 className="mt-2 font-mono text-3xl font-semibold tracking-normal text-[var(--vault-green)] sm:text-5xl">SHLM</h1>
                <p className="mt-2 text-xs leading-relaxed text-[var(--vault-green-soft)] sm:text-sm">Initializing disciplined execution.</p>
              </div>
            </div>

            <div className="mt-8 space-y-1.5 text-[11px] leading-relaxed text-[var(--vault-green-soft)] sm:text-xs">
              {BOOT_LINES.map((line, index) => (
                <p key={line} className="home-vault-line" style={{ animationDelay: `${index * 120}ms` }}>{line}</p>
              ))}
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-md overflow-hidden border border-[var(--vault-line)] bg-[var(--vault-panel)] p-5 sm:p-7" aria-label="SHLM account access">
            {isOpening && (
              <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-[var(--vault-bg)]">
                <div className="home-vault-door-left absolute inset-y-0 left-0 w-1/2 border-r border-[var(--vault-line)] bg-[var(--vault-panel)]" />
                <div className="home-vault-door-right absolute inset-y-0 right-0 w-1/2 border-l border-[var(--vault-line)] bg-[var(--vault-panel)]" />
                <div className="relative z-10 text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--vault-green)]">ACCESS GRANTED</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-[var(--vault-green-soft)]">Opening SHLM</p>
                </div>
              </div>
            )}

            {returningUser && phase !== "opening" ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--vault-amber)]">Session verified</p>
                <p className="mt-4 text-sm text-[var(--vault-green-soft)]">Restoring secure access…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 border border-[var(--vault-line)] p-1">
                  <Button type="button" variant="ghost" onClick={() => switchMode("signin")} className={mode === "signin" ? "rounded-sm bg-[var(--vault-green)] text-[var(--vault-bg)] hover:bg-[var(--vault-green)]" : "rounded-sm text-[var(--vault-green-soft)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-green)]"}>Sign in</Button>
                  <Button type="button" variant="ghost" onClick={() => switchMode("signup")} className={mode === "signup" ? "rounded-sm bg-[var(--vault-green)] text-[var(--vault-bg)] hover:bg-[var(--vault-green)]" : "rounded-sm text-[var(--vault-green-soft)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-green)]"}>Create account</Button>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--vault-amber)]">{isSignup ? "New operator registration" : "Operator authentication"}</p>
                  <p className="mt-2 text-xs text-[var(--vault-green-soft)]">{isSignup ? "Create your access credentials." : "Enter credentials or continue with Google."}</p>
                </div>

                <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading || phase === "booting"} className="mt-5 h-11 w-full rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-green)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-green)]">
                  <GoogleMark /> Continue with Google
                </Button>

                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--vault-green-soft)]"><span className="h-px flex-1 bg-[var(--vault-line)]" />or<span className="h-px flex-1 bg-[var(--vault-line)]" /></div>

                <form onSubmit={handleEmail} className="space-y-3.5">
                  {isSignup && <TerminalField label="Full name" type="text" value={name} onChange={setName} autoComplete="name" />}
                  <TerminalField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
                  <TerminalField label="Password" type="password" value={password} onChange={setPassword} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} />
                  {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
                  {notice && <p role="status" className="text-xs leading-relaxed text-[var(--vault-amber)]">{notice}</p>}
                  <Button type="submit" disabled={loading || phase === "booting"} className="h-11 w-full rounded-sm bg-[var(--vault-green)] text-[var(--vault-bg)] hover:bg-[var(--vault-green-soft)]">
                    {loading ? "Authenticating…" : isSignup ? "Create account" : "Enter SHLM"}
                  </Button>
                </form>

                <Button type="button" variant="ghost" onClick={openHomepage} disabled={phase === "booting"} className="mt-3 h-11 w-full rounded-sm text-[var(--vault-green-soft)] underline underline-offset-4 hover:bg-[var(--vault-line)] hover:text-[var(--vault-green)]">
                  Explore without signing in
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TerminalField({ label, type, value, onChange, autoComplete, required, minLength }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; required?: boolean; minLength?: number }) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--vault-green-soft)]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} minLength={minLength} className="mt-1.5 h-11 w-full rounded-none border border-[var(--vault-line)] bg-[var(--vault-bg)] px-3 text-sm text-[var(--vault-green)] outline-none transition-colors placeholder:text-[var(--vault-green-soft)] focus:border-[var(--vault-green)] focus:ring-1 focus:ring-[var(--vault-green)]" />
    </label>
  );
}

function GoogleMark() {
  return <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px] font-bold">G</span>;
}
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminMode } from "@/hooks/use-admin-mode";

type Mode = "signin" | "signup";
type Phase = "booting" | "ready" | "opening";
type AdminStage = "closed" | "credentials" | "checking" | "passcode";

const ACCESS_INTENT_KEY = "shlm.homeVaultAccessIntent";

const BOOT_LINES = [
  "> SHLM SECURE TERMINAL v2.6",
  "> market systems ........ online",
  "> encrypted channel ..... established",
  "> identity gateway ...... ready",
];

export function HomepageVaultBoot({ onComplete }: { onComplete: () => void }) {
  const { checked: adminChecked, isStaff, role, enter, dismissPrompt } = useAdminMode();
  const [mode, setMode] = useState<Mode>("signin");
  const [phase, setPhase] = useState<Phase>("booting");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [returningUser, setReturningUser] = useState(false);
  const [sessionFound, setSessionFound] = useState(false);
  const [adminRequested, setAdminRequested] = useState(false);
  const [adminStage, setAdminStage] = useState<AdminStage>("closed");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const minimumBoot = window.setTimeout(() => {
      if (active) setPhase((current) => (current === "booting" ? "ready" : current));
    }, 900);

    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      setReturningUser(true);
      setSessionFound(true);
      const intent = window.sessionStorage.getItem(ACCESS_INTENT_KEY);
      dismissPrompt();
      if (intent === "member") {
        window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
        window.setTimeout(() => {
          if (active) setPhase("opening");
        }, 700);
        return;
      }
      if (intent === "admin") {
        setAdminRequested(true);
        setAdminStage("checking");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(minimumBoot);
    };
  }, [dismissPrompt]);

  useEffect(() => {
    if (!sessionFound || !adminChecked || phase === "opening") return;
    if (isStaff) {
      setAdminRequested(true);
      setAdminStage("passcode");
      setAdminError(null);
      return;
    }
    if (adminRequested) {
      setAdminStage("credentials");
      setAdminError("This account does not have SHLM admin access.");
      return;
    }
    const timer = window.setTimeout(() => setPhase("opening"), 700);
    return () => window.clearTimeout(timer);
  }, [adminChecked, adminRequested, isStaff, phase, sessionFound]);

  useEffect(() => {
    if (phase !== "opening") return;
    const timer = window.setTimeout(onComplete, 1250);
    return () => window.clearTimeout(timer);
  }, [onComplete, phase]);

  const openHomepage = () => {
    window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
    dismissPrompt();
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
          dismissPrompt();
          openHomepage();
          return;
        }
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setReturningUser(true);
        dismissPrompt();
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
    window.sessionStorage.setItem(ACCESS_INTENT_KEY, "member");
    dismissPrompt();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const openAdminAccess = () => {
    dismissPrompt();
    setAdminRequested(true);
    setAdminError(null);
    setAdminStage(sessionFound && isStaff ? "passcode" : "credentials");
  };

  const handleAdminEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminLoading(true);
    setAdminError(null);
    window.sessionStorage.setItem(ACCESS_INTENT_KEY, "admin");
    dismissPrompt();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (signInError) throw signInError;
      setReturningUser(true);
      setSessionFound(true);
      setAdminStage("checking");
    } catch (caught) {
      window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
      setAdminError(caught instanceof Error ? caught.message : "Could not authenticate this account.");
      setAdminStage("credentials");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminGoogle = async () => {
    setAdminLoading(true);
    setAdminError(null);
    window.sessionStorage.setItem(ACCESS_INTENT_KEY, "admin");
    dismissPrompt();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
      setAdminError(oauthError.message);
      setAdminLoading(false);
    }
  };

  const handleAdminPasscode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminLoading(true);
    setAdminError(null);
    try {
      const result = await enter(adminPasscode.trim());
      if (!result.ok) {
        setAdminError(result.reason === "bad-passcode" ? "That admin passcode is incorrect." : "This account does not have SHLM admin access.");
        return;
      }
      window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
      setReturningUser(true);
      setPhase("opening");
    } catch {
      setAdminError("Could not verify the admin passcode. Try again.");
    } finally {
      setAdminLoading(false);
    }
  };

  const continueAsMember = () => {
    window.sessionStorage.removeItem(ACCESS_INTENT_KEY);
    dismissPrompt();
    setPhase("opening");
  };

  const isSignup = mode === "signup";
  const isOpening = phase === "opening";

  return (
    <main className="vault-boot relative min-h-svh overflow-x-hidden bg-[var(--vault-bg)] font-mono text-[var(--vault-ink)]">
      <Button type="button" variant="ghost" onClick={openHomepage} className="fixed right-3 top-3 z-30 rounded-sm border border-[var(--vault-line)] bg-[var(--vault-bg)] text-[10px] uppercase tracking-[0.18em] text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)] sm:right-5 sm:top-5">
        Skip / Explore
      </Button>

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] md:gap-10 lg:gap-16">
          <section aria-label="SHLM secure terminal" className="mx-auto w-full max-w-xl lg:mx-0">
            <div className="flex items-center justify-between border-b border-[var(--vault-line)] pb-3 text-[10px] uppercase tracking-[0.28em] text-[var(--vault-muted)]">
              <span>SHLM // secure access</span>
              <span className="text-[var(--vault-accent)]">{isOpening ? "unsealing" : phase}</span>
            </div>

            <div className="mt-8 flex items-center gap-6 sm:gap-8">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center sm:h-32 sm:w-32">
                <div className="home-vault-pulse absolute inset-0 rounded-full border border-[var(--vault-ink)] opacity-40" />
                <div className="home-vault-logo relative grid h-20 w-20 place-items-center rounded-full border border-[var(--vault-line)] bg-[var(--vault-panel)] p-3 sm:h-28 sm:w-28 sm:p-4">
                  <img src="/favicon.png" alt="SHLM" className="h-full w-full rounded-full object-contain" width={512} height={512} />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--vault-accent)]">Private trading network</p>
                <h1 className="mt-2 font-mono text-3xl font-semibold tracking-normal text-[var(--vault-ink)] sm:text-5xl">SHLM</h1>
                <p className="mt-2 text-xs leading-relaxed text-[var(--vault-muted)] sm:text-sm">Initializing disciplined execution.</p>
              </div>
            </div>

            <div className="mt-8 space-y-1.5 text-[11px] leading-relaxed text-[var(--vault-muted)] sm:text-xs">
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
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--vault-ink)]">ACCESS GRANTED</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-[var(--vault-muted)]">Opening SHLM</p>
                </div>
              </div>
            )}

            {(!adminRequested || !sessionFound) && (returningUser && phase !== "opening" ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--vault-accent)]">Session verified</p>
                <p className="mt-4 text-sm text-[var(--vault-muted)]">Restoring secure access…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 border border-[var(--vault-line)] p-1">
                  <Button type="button" variant="ghost" onClick={() => switchMode("signin")} className={mode === "signin" ? "rounded-sm bg-[var(--vault-ink)] text-[var(--vault-bg)] hover:bg-[var(--vault-ink)]" : "rounded-sm text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"}>Sign in</Button>
                  <Button type="button" variant="ghost" onClick={() => switchMode("signup")} className={mode === "signup" ? "rounded-sm bg-[var(--vault-ink)] text-[var(--vault-bg)] hover:bg-[var(--vault-ink)]" : "rounded-sm text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"}>Create account</Button>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--vault-accent)]">{isSignup ? "New operator registration" : "Operator authentication"}</p>
                  <p className="mt-2 text-xs text-[var(--vault-muted)]">{isSignup ? "Create your access credentials." : "Enter credentials or continue with Google."}</p>
                </div>

                <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading || phase === "booting"} className="mt-5 h-11 w-full rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-ink)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]">
                  <GoogleMark /> Continue with Google
                </Button>

                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--vault-muted)]"><span className="h-px flex-1 bg-[var(--vault-line)]" />or<span className="h-px flex-1 bg-[var(--vault-line)]" /></div>

                <form onSubmit={handleEmail} className="space-y-3.5">
                  {isSignup && <TerminalField label="Full name" type="text" value={name} onChange={setName} autoComplete="name" />}
                  <TerminalField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
                  <TerminalField label="Password" type="password" value={password} onChange={setPassword} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} />
                  {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
                  {notice && <p role="status" className="text-xs leading-relaxed text-[var(--vault-accent)]">{notice}</p>}
                  <Button type="submit" disabled={loading || phase === "booting"} className="h-11 w-full rounded-sm bg-[var(--vault-ink)] text-[var(--vault-bg)] hover:bg-[var(--vault-muted)]">
                    {loading ? "Authenticating…" : isSignup ? "Create account" : "Enter SHLM"}
                  </Button>
                </form>

                <Button type="button" variant="ghost" onClick={openHomepage} className="mt-3 h-11 w-full rounded-sm text-[var(--vault-muted)] underline underline-offset-4 hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]">Explore without signing in</Button>

                <AdminAccess
                  stage={adminStage}
                  email={adminEmail}
                  password={adminPassword}
                  passcode={adminPasscode}
                  loading={adminLoading}
                  error={adminError}
                  role={role}
                  signedIn={sessionFound}
                  booting={phase === "booting"}
                  onOpen={openAdminAccess}
                  onEmailChange={setAdminEmail}
                  onPasswordChange={setAdminPassword}
                  onPasscodeChange={setAdminPasscode}
                  onEmailSubmit={handleAdminEmail}
                  onGoogle={handleAdminGoogle}
                  onPasscodeSubmit={handleAdminPasscode}
                  onContinueAsMember={continueAsMember}
                />
              </>
            ))}

            {adminRequested && sessionFound && phase !== "opening" && (
              <AdminAccess
                stage={adminStage}
                email={adminEmail}
                password={adminPassword}
                passcode={adminPasscode}
                loading={adminLoading}
                error={adminError}
                role={role}
                signedIn={sessionFound}
                booting={phase === "booting"}
                onOpen={openAdminAccess}
                onEmailChange={setAdminEmail}
                onPasswordChange={setAdminPassword}
                onPasscodeChange={setAdminPasscode}
                onEmailSubmit={handleAdminEmail}
                onGoogle={handleAdminGoogle}
                onPasscodeSubmit={handleAdminPasscode}
                onContinueAsMember={continueAsMember}
                standalone
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminAccess({ stage, email, password, passcode, loading, error, role, signedIn, booting, onOpen, onEmailChange, onPasswordChange, onPasscodeChange, onEmailSubmit, onGoogle, onPasscodeSubmit, onContinueAsMember, standalone = false }: {
  stage: AdminStage;
  email: string;
  password: string;
  passcode: string;
  loading: boolean;
  error: string | null;
  role: "admin" | "shlm_mod" | null;
  signedIn: boolean;
  booting: boolean;
  onOpen: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasscodeChange: (value: string) => void;
  onEmailSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
  onPasscodeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onContinueAsMember: () => void;
  standalone?: boolean;
}) {
  const roleLabel = role === "shlm_mod" ? "SHLM MOD" : "SHLM FOUNDER";

  return (
    <div className={standalone ? "" : "mt-5 border-t border-[var(--vault-line)] pt-5"}>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--vault-line)]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--vault-accent)]">Admin access</p>
        <span className="h-px flex-1 bg-[var(--vault-line)]" />
      </div>

      {stage === "closed" && (
        <Button type="button" variant="outline" onClick={onOpen} disabled={booting} className="mt-4 h-11 w-full rounded-sm border-[var(--vault-accent)]/60 bg-transparent text-[var(--vault-accent)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-accent)]">
          Open admin terminal
        </Button>
      )}

      {stage === "checking" && (
        <div className="py-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--vault-muted)]">Verifying staff clearance…</p>
        </div>
      )}

      {stage === "credentials" && (
        <div className="mt-4">
          <p className="text-xs leading-relaxed text-[var(--vault-muted)]">Authenticate with your authorized staff account.</p>
          {!signedIn && (
            <>
              <Button type="button" variant="outline" onClick={onGoogle} disabled={loading || booting} className="mt-4 h-11 w-full rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-ink)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]">
                <GoogleMark /> Continue with Google
              </Button>
              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--vault-muted)]"><span className="h-px flex-1 bg-[var(--vault-line)]" />or<span className="h-px flex-1 bg-[var(--vault-line)]" /></div>
              <form onSubmit={onEmailSubmit} className="space-y-3.5">
                <TerminalField label="Admin email" type="email" value={email} onChange={onEmailChange} autoComplete="email" required />
                <TerminalField label="Password" type="password" value={password} onChange={onPasswordChange} autoComplete="current-password" required />
                <Button type="submit" disabled={loading || booting} className="h-11 w-full rounded-sm bg-[var(--vault-accent)] text-[var(--vault-bg)] hover:opacity-90">
                  {loading ? "Authenticating…" : "Authenticate admin"}
                </Button>
              </form>
            </>
          )}
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
          {signedIn && <Button type="button" variant="ghost" onClick={onContinueAsMember} className="mt-3 h-10 w-full rounded-sm text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]">Continue as member</Button>}
        </div>
      )}

      {stage === "passcode" && (
        <form onSubmit={onPasscodeSubmit} className="mt-4 space-y-3.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--vault-ink)]">{roleLabel} clearance confirmed</p>
            <p className="mt-2 text-xs text-[var(--vault-muted)]">Enter your secure admin passcode to unlock controls.</p>
          </div>
          <TerminalField label="Admin passcode" type="password" value={passcode} onChange={onPasscodeChange} autoComplete="off" required />
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || passcode.trim().length === 0} className="h-11 w-full rounded-sm bg-[var(--vault-accent)] text-[var(--vault-bg)] hover:opacity-90">
            {loading ? "Verifying…" : `Unlock ${roleLabel}`}
          </Button>
          <Button type="button" variant="ghost" onClick={onContinueAsMember} className="h-10 w-full rounded-sm text-[var(--vault-muted)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]">Continue as member</Button>
        </form>
      )}
    </div>
  );
}

function TerminalField({ label, type, value, onChange, autoComplete, required, minLength }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; required?: boolean; minLength?: number }) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--vault-muted)]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} minLength={minLength} className="mt-1.5 h-11 w-full rounded-none border border-[var(--vault-line)] bg-[var(--vault-bg)] px-3 text-sm text-[var(--vault-ink)] outline-none transition-colors placeholder:text-[var(--vault-muted)] focus:border-[var(--vault-ink)] focus:ring-1 focus:ring-[var(--vault-ink)]" />
    </label>
  );
}

function GoogleMark() {
  return <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px] font-bold">G</span>;
}
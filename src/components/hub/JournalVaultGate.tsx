import { useEffect, useRef, useState } from "react";

/**
 * Decorative security-terminal gate shown before the journal content.
 * Purely visual: the real data access is protected by Supabase auth + RLS.
 *
 * This version is per-user: first open is a setup screen; later opens verify
 * against the member's saved SHA-256 hash stored on the server.
 */
const MIN_LENGTH = 5;
const MAX_LENGTH = 8;
const SCRAMBLE = "▚▞█▓▒░#@$%&*01";

const BOOT_LINES = [
  "> shlm secure vault v2.6",
  "> channel ................ encrypted",
  "> operator .............. verified",
  "> journal ............... SEALED",
  "> authentication required",
];

interface Props {
  getStatus: () => Promise<{ configured: boolean; length?: number | null }>;
  setPasscode: (passcode: string) => Promise<{ saved: boolean }>;
  verify: (passcode: string) => Promise<{ valid: boolean }>;
  onUnlock: () => void;
}

export function JournalVaultGate({ getStatus, setPasscode, verify, onUnlock }: Props) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [savedLength, setSavedLength] = useState<number | null>(null);

  const [mode, setMode] = useState<"setup" | "verify">("verify");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phase, setPhase] = useState<"locked" | "opening">("locked");
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scramble, setScramble] = useState("");
  const busy = phase !== "locked";
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // Number of boxes for the verify screen: the member's own code length when
  // known, otherwise fall back to the flexible max.
  const verifyLength =
    savedLength && savedLength >= MIN_LENGTH && savedLength <= MAX_LENGTH ? savedLength : null;
  const verifyBoxes = verifyLength ?? MAX_LENGTH;
  const verifyLengthRef = useRef(verifyLength);
  verifyLengthRef.current = verifyLength;


  useEffect(() => {
    let mounted = true;
    getStatus()
      .then(({ configured, length }) => {
        if (!mounted) return;
        setConfigured(configured);
        setSavedLength(typeof length === "number" ? length : null);
        setMode(configured ? "verify" : "setup");
        setLoading(false);
      })

      .catch(() => {
        if (!mounted) return;
        setConfigured(false);
        setMode("setup");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [getStatus]);

  const runUnlock = () => {
    setPhase("opening");
  };

  const submitVerify = async (value: string) => {
    try {
      const { valid } = await verify(value);
      if (!valid) {
        setDenied(true);
        setCode("");
        window.setTimeout(() => setDenied(false), 900);
        return;
      }
      runUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setDenied(true);
      setCode("");
      window.setTimeout(() => setDenied(false), 900);
    }
  };

  const submitSetup = async (value: string, confirmation: string) => {
    if (value.length < MIN_LENGTH) {
      setError("Passcode too short");
      return;
    }
    if (value !== confirmation) {
      setError("Passcodes do not match");
      setDenied(true);
      setConfirm("");
      window.setTimeout(() => setDenied(false), 900);
      return;
    }
    try {
      await setPasscode(value);
      setConfigured(true);
      setMode("verify");
      runUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save passcode");
    }
  };

  const push = (digit: string) => {
    if (busy) return;
    setError(null);
    setDenied(false);

    if (mode === "setup") {
      if (confirm.length > 0 && confirm.length < MAX_LENGTH) {
        setConfirm((prev) => {
          const next = prev + digit;
          if (next.length === MAX_LENGTH) window.setTimeout(() => submitSetup(code, next), 120);
          return next;
        });
        return;
      }
      if (code.length < MAX_LENGTH) {
        setCode((prev) => {
          const next = prev + digit;
          if (next.length === MAX_LENGTH) {
            // move to confirmation automatically at max length
            window.setTimeout(() => setConfirm(next), 80);
          }
          return next;
        });
      }
      return;
    }

    // verify mode
    const expected = verifyLengthRef.current;
    setCode((prev) => {
      if (prev.length >= (expected ?? MAX_LENGTH)) return prev;
      const next = prev + digit;
      // Only auto-submit when we know how long this member's code is. With an
      // unknown length, submitting at MIN_LENGTH would lock out anyone whose
      // code is longer — they confirm with the unlock key instead.
      if (expected && next.length === expected) window.setTimeout(() => submitVerify(next), 120);
      return next;
    });
  };



  const backspace = () => {
    if (mode === "setup" && confirm.length > 0) {
      setConfirm((p) => p.slice(0, -1));
    } else {
      setCode((p) => p.slice(0, -1));
    }
  };

  const clear = () => {
    setCode("");
    setConfirm("");
    setError(null);
  };

  // Keyboard entry mirrors the on-screen keypad.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busyRef.current) return;
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unlock sequence: decrypt scramble, then hand over to the journal.
  useEffect(() => {
    if (phase !== "opening") return;
    const target = "ACCESS GRANTED";
    let frame = 0;
    const id = window.setInterval(() => {
      frame++;
      const revealed = Math.min(target.length, Math.floor(frame / 2));
      setScramble(
        target
          .slice(0, revealed)
          .concat(
            target
              .slice(revealed)
              .split("")
              .map((c) => (c === " " ? " " : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]!))
              .join(""),
          ),
      );
    }, 45);
    const done = window.setTimeout(onUnlock, 1750);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
    };
  }, [phase, onUnlock]);

  const activeValue = mode === "setup" && confirm.length > 0 ? confirm : code;

  return (
    <div className="vault-shell relative min-w-0 max-w-full overflow-hidden rounded-lg border border-[var(--vault-line)] bg-[var(--vault-bg)] p-3 font-mono text-[var(--vault-ink)] xs:p-4 sm:rounded-2xl sm:p-8">
      <style>{`
        .vault-shell { --vault-glow: 0 0 18px color-mix(in oklch, var(--vault-ink) 28%, transparent); }
        .vault-shell::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(180deg, color-mix(in oklch, var(--vault-ink) 7%, transparent) 0 1px, transparent 1px 3px);
        }
        .vault-shell::after {
          content: ""; position: absolute; left: 0; right: 0; height: 28%;
          pointer-events: none; opacity: .35;
          background: linear-gradient(180deg, transparent, color-mix(in oklch, var(--vault-ink) 18%, transparent), transparent);
          animation: vault-scan 4.2s linear infinite;
        }
        @keyframes vault-scan { 0% { top: -30%; } 100% { top: 100%; } }
        @keyframes vault-caret { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        .vault-caret { animation: vault-caret 1s step-end infinite; }
        @keyframes vault-glitch {
          0%,100% { transform: translate(0,0) }
          20% { transform: translate(-4px,1px) }
          40% { transform: translate(4px,-1px) }
          60% { transform: translate(-3px,-1px) }
          80% { transform: translate(3px,1px) }
        }
        .vault-glitch { animation: vault-glitch .32s linear 2; }
        @keyframes vault-door-l { from { transform: translateX(0) } to { transform: translateX(-102%) } }
        @keyframes vault-door-r { from { transform: translateX(0) } to { transform: translateX(102%) } }
        .vault-door-l { animation: vault-door-l 1.1s cubic-bezier(.7,0,.2,1) .5s forwards }
        .vault-door-r { animation: vault-door-r 1.1s cubic-bezier(.7,0,.2,1) .5s forwards }
        @keyframes vault-fade-up { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        .vault-line { animation: vault-fade-up .35s ease-out both }
        @media (prefers-reduced-motion: reduce) {
          .vault-shell::after, .vault-caret, .vault-glitch, .vault-door-l, .vault-door-r, .vault-line { animation: none !important; }
        }
      `}</style>

      <div className="relative z-10 mx-auto min-w-0 max-w-md">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-[var(--vault-muted)] xs:text-[10px] xs:tracking-[0.3em]">
          <span className="min-w-0 truncate">SHLM // vault</span>
          <span className={phase === "opening" ? "shrink-0 text-[var(--vault-ink)]" : denied ? "shrink-0 font-bold text-[var(--vault-ink)]" : "shrink-0 text-[var(--vault-accent)]"}>
            {phase === "opening" ? "unsealing" : denied ? "denied" : configured === false ? "setup" : "locked"}
          </span>
        </div>

        <div className="mt-4 space-y-0.5 text-[10px] leading-relaxed text-[var(--vault-muted)] xs:text-[11px] sm:mt-5 sm:space-y-1 sm:text-xs">
          {BOOT_LINES.map((line, i) => (
            <p key={line} className="vault-line" style={{ animationDelay: `${i * 110}ms` }}>
              {line}
            </p>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 text-center text-xs tracking-widest text-[var(--vault-muted)]">
            initializing vault…
          </div>
        ) : phase === "opening" ? (
          <div className="mt-7">
            <div className="relative h-28 overflow-hidden rounded-xl border border-[var(--vault-line)] bg-[var(--vault-bg)]/60">
              <div className="vault-door-l absolute inset-y-0 left-0 w-1/2 border-r border-[var(--vault-line)] bg-[var(--vault-panel)]" />
              <div className="vault-door-r absolute inset-y-0 right-0 w-1/2 border-l border-[var(--vault-line)] bg-[var(--vault-panel)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm tracking-[0.35em] text-[var(--vault-ink)] sm:text-base">{scramble}</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-[var(--vault-muted)]">
              decrypting journal…
            </p>
          </div>
        ) : mode === "setup" ? (
          <SetupPanel
            code={code}
            confirm={confirm}
            denied={denied}
            error={error}
            onPush={push}
            onBackspace={backspace}
            onClear={clear}
            onSubmit={() => submitSetup(code, confirm)}
          />
        ) : (
          <VerifyPanel
            code={code}
            boxes={verifyBoxes}
            denied={denied}
            error={error}
            onPush={push}
            onBackspace={backspace}
            onClear={clear}
          />

        )}
      </div>
    </div>
  );
}

interface PanelProps {
  code: string;
  denied: boolean;
  error: string | null;
  onPush: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

function SetupPanel({ code, confirm, denied, error, onPush, onBackspace, onClear, onSubmit }: PanelProps & { confirm: string; onSubmit: () => void }) {
  const step = confirm.length > 0 || code.length === MAX_LENGTH ? "confirm" : "choose";
  const value = step === "confirm" ? confirm : code;
  return (
    <div className={denied ? "vault-glitch mt-7" : "mt-7"}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--vault-muted)]">
        {step === "confirm" ? "confirm vault passcode" : "set your vault passcode"}
      </p>
      <div className="mt-3 grid grid-cols-8 gap-1 xs:gap-1.5 sm:gap-2.5">
        {Array.from({ length: MAX_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`flex h-10 min-w-0 items-center justify-center rounded-md border text-sm xs:h-11 sm:h-12 sm:rounded-lg sm:text-lg ${
              denied
                ? "border-[var(--vault-ink)] text-[var(--vault-ink)]"
                : i < value.length
                  ? "border-[var(--vault-ink)] bg-[var(--vault-line)] text-[var(--vault-ink)]"
                  : "border-[var(--vault-line)] text-[var(--vault-muted)]"
            }`}
            style={{ boxShadow: i < value.length && !denied ? "var(--vault-glow)" : undefined }}
          >
            {i < value.length ? "●" : i === value.length && !denied ? <span className="vault-caret">_</span> : ""}
          </span>
        ))}
      </div>

      <p className={`mt-3 h-4 text-[11px] tracking-widest ${denied ? "font-bold text-[var(--vault-ink)]" : error ? "text-[var(--vault-accent)]" : "text-[var(--vault-muted)]"}`}>
        {denied ? "ACCESS DENIED — retry" : error ?? "choose 5–8 digits, then confirm"}
      </p>

      <Keypad onPush={onPush} onBackspace={onBackspace} onClear={onClear} />

      {step === "confirm" && (
        <button
          type="button"
          onClick={onSubmit}
          className="mt-4 w-full rounded-lg border border-[var(--vault-line)] bg-[var(--vault-line)] py-2.5 text-xs uppercase tracking-widest text-[var(--vault-ink)] transition-colors hover:bg-[var(--vault-ink)] hover:text-[var(--vault-bg)]"
        >
          Seal vault
        </button>
      )}
    </div>
  );
}

function VerifyPanel({ code, boxes, denied, error, onPush, onBackspace, onClear }: PanelProps & { boxes: number }) {
  return (
    <div className={denied ? "vault-glitch mt-7" : "mt-7"}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--vault-muted)]">enter passcode</p>
      <div className="mt-3 grid grid-flow-col auto-cols-fr gap-1.5 xs:gap-2.5">
        {Array.from({ length: boxes }).map((_, i) => (

          <span
            key={i}
            className={`flex h-10 min-w-0 items-center justify-center rounded-md border text-sm xs:h-11 sm:h-12 sm:rounded-lg sm:text-lg ${
              denied
                ? "border-[var(--vault-ink)] text-[var(--vault-ink)]"
                : i < code.length
                  ? "border-[var(--vault-ink)] bg-[var(--vault-line)] text-[var(--vault-ink)]"
                  : "border-[var(--vault-line)] text-[var(--vault-muted)]"
            }`}
            style={{ boxShadow: i < code.length && !denied ? "var(--vault-glow)" : undefined }}
          >
            {i < code.length ? "●" : i === code.length && !denied ? <span className="vault-caret">_</span> : ""}
          </span>
        ))}
      </div>

      <p className={`mt-3 h-4 text-[11px] tracking-widest ${denied ? "font-bold text-[var(--vault-ink)]" : error ? "text-[var(--vault-accent)]" : "text-[var(--vault-muted)]"}`}>
        {denied ? "ACCESS DENIED — retry" : error ?? "keypad or keyboard"}
      </p>

      <Keypad onPush={onPush} onBackspace={onBackspace} onClear={onClear} />
    </div>
  );
}

function Keypad({ onPush, onBackspace, onClear }: Omit<PanelProps, "code" | "denied" | "error">) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 xs:mt-4 xs:gap-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <KeypadKey key={d} onClick={() => onPush(d)}>
          {d}
        </KeypadKey>
      ))}
      <KeypadKey onClick={onClear}>CLR</KeypadKey>
      <KeypadKey onClick={() => onPush("0")}>0</KeypadKey>
      <KeypadKey onClick={onBackspace}>⌫</KeypadKey>
    </div>
  );
}

function KeypadKey({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 min-w-0 rounded-md border border-[var(--vault-line)] bg-[var(--vault-panel)] text-sm tracking-widest text-[var(--vault-ink)] transition-colors hover:border-[var(--vault-ink)] hover:bg-[var(--vault-line)] active:bg-[var(--vault-ink)] active:text-[var(--vault-bg)] xs:min-h-11 sm:min-h-12 sm:rounded-lg"
    >
      {children}
    </button>
  );
}

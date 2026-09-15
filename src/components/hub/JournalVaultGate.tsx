import { useEffect, useRef, useState } from "react";

/**
 * Decorative security-terminal gate shown before the journal content.
 * Purely visual: the real data access is protected by Supabase auth + RLS.
 */
const PASSCODE = "11711";
const LENGTH = PASSCODE.length;
const SCRAMBLE = "▚▞█▓▒░#@$%&*01";

const BOOT_LINES = [
  "> shlm secure vault v2.6",
  "> channel ................ encrypted",
  "> operator .............. verified",
  "> journal ............... SEALED",
  "> authentication required",
];

export function JournalVaultGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [denied, setDenied] = useState(false);
  const [phase, setPhase] = useState<"locked" | "opening">("locked");
  const [scramble, setScramble] = useState("");
  const busy = phase !== "locked";
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const submit = (value: string) => {
    if (value !== PASSCODE) {
      setDenied(true);
      setCode("");
      window.setTimeout(() => setDenied(false), 900);
      return;
    }
    setPhase("opening");
  };

  const push = (digit: string) => {
    if (busy) return;
    setDenied(false);
    setCode((prev) => {
      if (prev.length >= LENGTH) return prev;
      const next = prev + digit;
      if (next.length === LENGTH) window.setTimeout(() => submit(next), 120);
      return next;
    });
  };

  // Keyboard entry mirrors the on-screen keypad.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busyRef.current) return;
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") setCode((p) => p.slice(0, -1));
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

  return (
    <div className="vault-shell relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#04070a] p-5 font-mono text-emerald-400 sm:p-8">
      <style>{`
        .vault-shell { --vault-glow: 0 0 18px rgba(16,185,129,.35); }
        .vault-shell::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(180deg, rgba(16,185,129,.07) 0 1px, transparent 1px 3px);
        }
        .vault-shell::after {
          content: ""; position: absolute; left: 0; right: 0; height: 28%;
          pointer-events: none; opacity: .35;
          background: linear-gradient(180deg, transparent, rgba(16,185,129,.22), transparent);
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
      `}</style>

      <div className="relative z-10 mx-auto max-w-md">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-emerald-500/70">
          <span>SHLM // vault</span>
          <span className={phase === "opening" ? "text-emerald-300" : "text-amber-400"}>
            {phase === "opening" ? "unsealing" : "locked"}
          </span>
        </div>

        <div className="mt-5 space-y-1 text-[11px] leading-relaxed text-emerald-500/80 sm:text-xs">
          {BOOT_LINES.map((line, i) => (
            <p key={line} className="vault-line" style={{ animationDelay: `${i * 110}ms` }}>
              {line}
            </p>
          ))}
        </div>

        {phase === "opening" ? (
          <div className="mt-7">
            <div className="relative h-28 overflow-hidden rounded-xl border border-emerald-500/40 bg-black/60">
              <div className="vault-door-l absolute inset-y-0 left-0 w-1/2 border-r border-emerald-500/50 bg-gradient-to-r from-[#0a1410] to-[#0f2a20]" />
              <div className="vault-door-r absolute inset-y-0 right-0 w-1/2 border-l border-emerald-500/50 bg-gradient-to-l from-[#0a1410] to-[#0f2a20]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm tracking-[0.35em] text-emerald-300 sm:text-base">{scramble}</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-emerald-500/70">
              decrypting journal…
            </p>
          </div>
        ) : (
          <div className={denied ? "vault-glitch mt-7" : "mt-7"}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-500/70">enter passcode</p>
            <div className="mt-3 flex items-center gap-2.5">
              {Array.from({ length: LENGTH }).map((_, i) => (
                <span
                  key={i}
                  className={`flex h-12 flex-1 items-center justify-center rounded-lg border text-lg ${
                    denied
                      ? "border-red-500/70 text-red-400"
                      : i < code.length
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                        : "border-emerald-500/30 text-emerald-500/40"
                  }`}
                  style={{ boxShadow: i < code.length && !denied ? "var(--vault-glow)" : undefined }}
                >
                  {i < code.length ? "●" : i === code.length && !denied ? <span className="vault-caret">_</span> : ""}
                </span>
              ))}
            </div>

            <p className={`mt-3 h-4 text-[11px] tracking-widest ${denied ? "text-red-400" : "text-emerald-500/60"}`}>
              {denied ? "ACCESS DENIED — retry" : "keypad or keyboard"}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <KeypadKey key={d} onClick={() => push(d)}>
                  {d}
                </KeypadKey>
              ))}
              <KeypadKey onClick={() => setCode("")}>CLR</KeypadKey>
              <KeypadKey onClick={() => push("0")}>0</KeypadKey>
              <KeypadKey onClick={() => setCode((p) => p.slice(0, -1))}>⌫</KeypadKey>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KeypadKey({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-sm tracking-widest text-emerald-300 transition-colors hover:border-emerald-400 hover:bg-emerald-500/15 active:bg-emerald-500/25"
    >
      {children}
    </button>
  );
}

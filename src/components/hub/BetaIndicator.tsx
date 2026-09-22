import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitBetaUsername, verifyBetaPassword } from "@/lib/beta.functions";
import indicatorVideo from "@/assets/indicator-preview.mp4.asset.json";
import indicatorVideoWebm from "@/assets/indicator-preview.webm.asset.json";
import indicatorPoster from "@/assets/indicator-poster.jpg.asset.json";

const STEPS = [
  "Send your TradingView username to the SHLM desk so the script can be added to your invite-only list.",
  "Open TradingView and sign in with that same username.",
  "Open any chart, then click Indicators in the top toolbar.",
  "Go to Invite-only scripts and select SHLM SYSTEM.",
  "Add it to your chart — it stays saved to your layout after that.",
  "Report anything odd (missed signals, repainting, wrong levels) back to the desk with a screenshot and the chart timeframe.",
];

const UNLOCK_KEY = "shlm.betaUnlocked";
const ASSET_ORIGIN = "https://shlm-trading-bloom.lovable.app";
const indicatorVideoUrl = new URL(indicatorVideo.url, ASSET_ORIGIN).toString();
const indicatorVideoWebmUrl = new URL(indicatorVideoWebm.url, ASSET_ORIGIN).toString();
const indicatorPosterUrl = new URL(indicatorPoster.url, ASSET_ORIGIN).toString();

export function BetaIndicator({ onClose }: { onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(UNLOCK_KEY) === "1",
  );

  return (
    <div className="relative min-w-0 max-w-full rounded-3xl border border-border bg-background p-4 xs:p-5 sm:p-7">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition-colors hover:bg-accent sm:right-3 sm:top-3"
        aria-label="Close beta testing"
      >
        ✕
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 pr-10">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Beta testing · VIP
        </p>
        <h2 className="min-w-0 break-words font-display text-xl font-medium tracking-tight sm:text-2xl">
          SHLM SYSTEM — TradingView indicator
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite-only beta. Access is granted per TradingView username.
        </p>
      </div>

      {unlocked ? (
        <Instructions />
      ) : (
        <PasswordGate
          onUnlock={() => {
            window.sessionStorage.setItem(UNLOCK_KEY, "1");
            setUnlocked(true);
          }}
        />
      )}
    </div>
  );
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const verify = useServerFn(verifyBetaPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verify({ data: { password } });
      if (res.ok) {
        onUnlock();
        return;
      }
      setError("That password isn't right.");
      setPassword("");
    } catch {
      setError("Couldn't check that right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <label htmlFor="beta-password" className="text-sm font-medium">
        Enter your beta access password
      </label>
      <input
        id="beta-password"
        type="password"
        autoComplete="off"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Beta password"
        className="min-h-11 w-full min-w-0 rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-foreground sm:text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Unlock beta access"}
      </button>
      {error && <p className="text-sm font-medium">{error}</p>}
      <p className="text-xs text-muted-foreground">
        The password is handed out by the SHLM desk to selected beta testers.
      </p>
    </form>
  );
}

function Instructions() {
  return (
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background">
        <video
          key={indicatorVideoUrl}
          controls
          playsInline
          muted
          preload="metadata"
          poster={indicatorPosterUrl}
          className="block h-auto w-full bg-black"
          aria-label="SHLM SYSTEM indicator preview on Micro Gold Futures"
        >
          <source src={indicatorVideoUrl} type="video/mp4" />
          <source src={indicatorVideoWebmUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Preview · Micro Gold Futures (MGC) on a 5-minute chart
          </p>
          <a
            href={indicatorVideoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] font-medium underline underline-offset-4 hover:text-foreground"
          >
            Open video ↗
          </a>
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-2xl border border-border bg-accent/30 p-4">
        <h3 className="text-sm font-semibold">What the indicator is doing</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="min-w-0 break-words">
            <span className="font-medium text-foreground">London / kill-zones</span> — shaded time windows where the indicator expects institutional moves.
          </li>
          <li className="min-w-0 break-words">
            <span className="font-medium text-foreground">BISL / BISI levels</span> — buy-side / sell-side liquidity and breaker blocks drawn straight off the 1H structure.
          </li>
          <li className="min-w-0 break-words">
            <span className="font-medium text-foreground">Order labels</span> — visual Buy Stop / Buy Limit / Sell Stop markers mapped to the active setup.
          </li>
          <li className="min-w-0 break-words">
            <span className="font-medium text-foreground">Trend panel</span> — trend direction, 1H trend, aggressive stop, plus ATR, VIX and momentum readouts.
          </li>
        </ul>
      </div>

      <ol className="mt-6 space-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">
              {i + 1}
            </span>
            <span className="min-w-0 break-words text-sm leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      <UsernameSubmit />

      <a
        href="https://www.tradingview.com/chart/"
        target="_blank"
        rel="noreferrer noopener"
        className="mt-6 inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Open TradingView ↗
      </a>

      <p className="mt-4 text-xs text-muted-foreground">
        Beta build — behavior can change between updates. Don't share the script or screenshots of its
        source outside the desk.
      </p>
    </>
  );
}

function UsernameSubmit() {
  const send = useServerFn(submitBetaUsername);
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || username.trim().length < 2) {
      setStatus("Enter your TradingView username first.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await send({ data: { username: username.trim(), note: note.trim() } });
      if (res.ok) {
        setSent(true);
        setStatus("Sent to the SHLM desk. You'll get access on TradingView shortly.");
      } else {
        setStatus(res.error ? `Couldn't send that: ${res.error}` : "Couldn't send that right now. Try again in a moment.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setStatus(message ? `Couldn't send that: ${message}` : "Couldn't send that right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-border bg-accent/20 p-4">
      <h3 className="text-sm font-semibold">Send your TradingView username</h3>
      <p className="text-xs text-muted-foreground">
        Goes straight to the SHLM desk so SHLM SYSTEM can be added to your invite-only scripts.
      </p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="TradingView username"
        autoComplete="off"
        className="min-h-11 w-full min-w-0 rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-foreground sm:text-sm"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional note (broker, timeframe, anything the desk should know)"
        className="w-full min-w-0 rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-foreground sm:text-sm"
      />
      <button
        type="submit"
        disabled={busy || sent}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {sent ? "Username sent" : busy ? "Sending…" : "Send username to SHLM desk"}
      </button>
      {status && <p className="text-sm font-medium">{status}</p>}
    </form>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function VaultCredentialFrame({
  children,
  className,
  label = "SHLM // secure access",
  status = "encrypted",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  status?: string;
}) {
  return (
    <section className={cn("credential-vault relative min-w-0 max-w-full overflow-hidden border border-[var(--vault-line)] bg-[var(--vault-panel)] p-4 font-mono text-[var(--vault-ink)] xs:p-5 sm:p-7", className)}>
      <div className="credential-vault-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--vault-line)] pb-3 text-[10px] uppercase tracking-[0.16em] xs:gap-4 xs:tracking-[0.24em]">
          <span className="min-w-0 truncate text-[var(--vault-muted)]">{label}</span>
          <span className="max-w-24 shrink-0 truncate text-right text-[var(--vault-accent)] xs:max-w-none">{status}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

export function VaultField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--vault-muted)]">
      {label}
      <input
        {...props}
        className={cn(
          "mt-1.5 h-11 min-w-0 w-full rounded-none border border-[var(--vault-line)] bg-[var(--vault-bg)] px-3 font-sans text-base text-[var(--vault-ink)] outline-hidden transition-colors placeholder:text-[var(--vault-muted)]/60 focus:border-[var(--vault-ink)] focus:ring-1 focus:ring-[var(--vault-ink)] sm:text-sm",
          props.className,
        )}
      />
    </label>
  );
}

export function VaultDivider({ children = "or" }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--vault-muted)]">
      <span className="h-px flex-1 bg-[var(--vault-line)]" />
      {children}
      <span className="h-px flex-1 bg-[var(--vault-line)]" />
    </div>
  );
}
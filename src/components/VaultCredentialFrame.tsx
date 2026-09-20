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
    <section className={cn("credential-vault relative overflow-hidden border border-[var(--vault-line)] bg-[var(--vault-panel)] p-5 font-mono text-[var(--vault-ink)] sm:p-7", className)}>
      <div className="credential-vault-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--vault-line)] pb-3 text-[10px] uppercase tracking-[0.24em]">
          <span className="truncate text-[var(--vault-muted)]">{label}</span>
          <span className="shrink-0 text-[var(--vault-accent)]">{status}</span>
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
          "mt-1.5 h-11 w-full rounded-none border border-[var(--vault-line)] bg-[var(--vault-bg)] px-3 font-sans text-sm text-[var(--vault-ink)] outline-hidden transition-colors placeholder:text-[var(--vault-muted)]/60 focus:border-[var(--vault-ink)] focus:ring-1 focus:ring-[var(--vault-ink)]",
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
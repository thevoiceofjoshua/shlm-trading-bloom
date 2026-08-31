import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First name for display: prefers an account name, otherwise derives it from the email local part. */
export function displayFirstName(name?: string | null, email?: string | null): string {
  const fromName = (name ?? "").trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = (email ?? "").split("@")[0] ?? "";
  const first = local.split(/[._\-+0-9]+/).filter(Boolean)[0] ?? "";
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(digits);
}

export function formatMinutes(prep?: number | null, cook?: number | null) {
  const total = (prep ?? 0) + (cook ?? 0);
  if (!total) return "—";
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Deterministic 0..n-1 from a string, so a recipe's cover never changes. */
export function hashIndex(value: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

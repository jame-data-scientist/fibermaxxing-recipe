import { randomBytes } from "node:crypto";

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Titles are not unique ("Dal" will happen twice), so add a short suffix. */
export function uniqueSlug(title: string): string {
  const base = slugify(title) || "recipe";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function submitterToken(): string {
  return randomBytes(18).toString("base64url");
}

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ?? "FiberMaxxing Kitchen";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  "https://play.google.com/store/apps/details?id=com.slothdev.fibermaxxing";

/**
 * Bump when the contributor licence or terms change. Every submission stores
 * the version it agreed to, so a takedown can always point at a real record.
 */
export const TERMS_VERSION = "2026-10-30";
export const LICENSE_VERSION = "2026-10-30";

export const TAG_LABELS: Record<string, string> = {
  high_fiber: "High fibre",
  high_protein: "High protein",
  both: "High fibre + protein",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  gluten_free: "Gluten free",
  dairy_free: "Dairy free",
};

export const DIET_TAGS = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
] as const;

export const ALLERGENS = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy" },
  { id: "egg", label: "Egg" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "nuts", label: "Tree nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soy", label: "Soy" },
  { id: "sesame", label: "Sesame" },
] as const;

export const PAGE_SIZE = 12;

export function absoluteUrl(path: string): string {
  return `${SITE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

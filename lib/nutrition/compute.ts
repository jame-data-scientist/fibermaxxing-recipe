/** Macro computation. Pure functions so the server never has to trust a client. */

export const HIGH_FIBER_G = 8;
export const HIGH_PROTEIN_G = 25;

export interface FoodNutrients {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}

export interface ComputedRow {
  grams: number | null;
  food: FoodNutrients | null;
  /** "negligible" rows (salt, water) are counted as zero, not as missing. */
  mappingStatus?: "mapped" | "unmapped" | "negligible";
}

export interface NutritionTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

export interface NutritionResult {
  total: NutritionTotals;
  perServing: NutritionTotals;
  confidence: "computed" | "incomplete";
  missing: number;
  mapped: number;
}

const ZERO: NutritionTotals = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0,
};

const KEYS: (keyof NutritionTotals)[] = [
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
  "sugarG",
  "sodiumMg",
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Sum per-100 g values by weight, then divide by servings.
 * A row with no food or no resolvable weight makes the result `incomplete`
 * instead of silently counting as zero — that is what stops publish.
 */
export function computeNutrition(
  rows: ComputedRow[],
  servings: number,
): NutritionResult {
  const safeServings =
    Number.isFinite(servings) && servings > 0 ? servings : 1;

  const total: NutritionTotals = { ...ZERO };
  let missing = 0;
  let mapped = 0;

  for (const row of rows) {
    if (row.mappingStatus === "negligible") {
      mapped += 1;
      continue;
    }
    if (!row.food || row.grams == null || row.grams <= 0) {
      missing += 1;
      continue;
    }
    mapped += 1;
    const factor = row.grams / 100;
    for (const key of KEYS) {
      const value = row.food[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        total[key] += value * factor;
      }
    }
  }

  for (const key of KEYS) total[key] = round2(total[key]);

  const perServing = Object.fromEntries(
    KEYS.map((key) => [key, round2(total[key] / safeServings)]),
  ) as unknown as NutritionTotals;

  return {
    total,
    perServing,
    confidence: missing === 0 ? "computed" : "incomplete",
    missing,
    mapped,
  };
}

/** Tags are derived from the numbers, never from a self-declared claim. */
export function deriveNutritionTags(perServing: NutritionTotals): string[] {
  const fiber = perServing.fiberG ?? 0;
  const protein = perServing.proteinG ?? 0;
  const tags: string[] = [];
  if (fiber >= HIGH_FIBER_G) tags.push("high_fiber");
  if (protein >= HIGH_PROTEIN_G) tags.push("high_protein");
  if (fiber >= HIGH_FIBER_G && protein >= HIGH_PROTEIN_G) tags.push("both");
  return tags;
}

/** Per-100 g values, when the cook supplied a serving weight. */
export function perHundredGrams(
  perServing: NutritionTotals,
  servingGrams: number | null | undefined,
): NutritionTotals | null {
  if (!servingGrams || servingGrams <= 0) return null;
  const factor = 100 / servingGrams;
  return Object.fromEntries(
    KEYS.map((key) => [key, round2(perServing[key] * factor)]),
  ) as unknown as NutritionTotals;
}

export function isHighFiber(fiberG: number): boolean {
  return fiberG >= HIGH_FIBER_G;
}

export function isHighProtein(proteinG: number): boolean {
  return proteinG >= HIGH_PROTEIN_G;
}

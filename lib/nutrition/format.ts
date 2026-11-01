import { formatNumber } from "../utils";

/**
 * Nutrients span nine orders of magnitude — grams of protein, micrograms of
 * B12 — so the number of decimals follows the size of the amount.
 */
export function formatNutrientValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100 || abs === 0) return formatNumber(value, 0);
  if (abs >= 10) return formatNumber(value, 1);
  if (abs >= 1) return formatNumber(value, 2);
  if (abs >= 0.1) return formatNumber(value, 3);
  return formatNumber(value, 4);
}

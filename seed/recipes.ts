import type { UnitId } from "../lib/nutrition/units";

/**
 * Seed recipes.
 *
 * The original eighteen editorial recipes were removed from the database, so
 * this array is deliberately empty: `npm run seed` now only refreshes the USDA
 * food catalog and will not republish anything.
 *
 * Add recipes here only if you own the rights to them — FatSecret's terms allow
 * a 24-hour cache, not republication. `food` is matched against the catalog's
 * curated short name first, then the exact USDA description, and the seeder
 * fails loudly if a name does not resolve.
 */

export interface SeedIngredient {
  food: string;
  amount: number;
  unit: UnitId;
  note?: string;
}

export interface SeedRecipe {
  slug: string;
  title: string;
  summary: string;
  authorName: string;
  countryCode: string;
  servings: number;
  servingNote: string;
  servingGrams: number;
  prepMinutes: number;
  cookMinutes: number;
  tips: string;
  dietTags: string[];
  ingredients: SeedIngredient[];
  steps: string[];
}

export const SEED_RECIPES: SeedRecipe[] = [];

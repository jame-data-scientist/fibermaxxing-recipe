/**
 * Recipe-level aggregation of the stored per-100 g food panels.
 *
 * The recipe page used to show five macro rows. Every food now carries the
 * full USDA panel, so this sums all of it by ingredient weight, divides by
 * servings, and groups the keys for display.
 */

import nutrientFile from "../../seed/nutrients.json";

interface NutrientDefinition {
  label: string;
  unit: string;
}

const DEFS = (
  nutrientFile as unknown as {
    nutrients: Record<string, NutrientDefinition>;
  }
).nutrients;

export interface PanelIngredient {
  grams: number | null;
  mappingStatus?: string | null;
  nutrients: Record<string, number> | null;
}

export interface NutrientRow {
  key: string;
  label: string;
  unit: string;
  value: number;
}

export interface NutrientGroup {
  id: string;
  title: string;
  description: string;
  rows: NutrientRow[];
}

export interface RecipePanel {
  /** Values per serving, keyed like the stored food panels. */
  values: Record<string, number>;
  groups: NutrientGroup[];
  /** Ingredients that had a mapped food with a usable weight. */
  matched: number;
  /** Ingredients on the recipe. */
  counted: number;
  /** Number of nutrient rows shown. */
  count: number;
}

const GROUPS: { id: string; title: string; description: string }[] = [
  {
    id: "macros",
    title: "Energy and macronutrients",
    description: "Energy, protein, fat, carbohydrate, fibre and sugars.",
  },
  {
    id: "fats",
    title: "Fats and fatty acids",
    description: "Total fat fractions, cholesterol and individual fatty acids.",
  },
  {
    id: "vitamins",
    title: "Vitamins and carotenoids",
    description: "Vitamins, folate forms and carotenoids.",
  },
  {
    id: "minerals",
    title: "Minerals",
    description: "Macro- and trace minerals.",
  },
  {
    id: "amino",
    title: "Amino acids",
    description: "Protein-building amino acids.",
  },
  {
    id: "other",
    title: "Phytochemicals and other compounds",
    description: "Plant compounds, organic acids and other tracked values.",
  },
];

const MACRO_KEYS = new Set([
  "kcal",
  "energy_kj",
  "protein_g",
  "fat_g",
  "carbs_g",
  "carbohydrate_by_summation_g",
  "fiber_g",
  "fiber_soluble_g",
  "fiber_insoluble_g",
  "total_dietary_fiber_aoac_2011_25_g",
  "high_molecular_weight_dietary_fiber_hmwdf_g",
  "low_molecular_weight_dietary_fiber_lmwdf_g",
  "beta_glucan_g",
  "sugars_g",
  "sugars_added_g",
  "starch_g",
  "resistant_starch_g",
  "sucrose_g",
  "glucose_g",
  "fructose_g",
  "lactose_g",
  "maltose_g",
  "galactose_g",
  "raffinose_g",
  "stachyose_g",
  "verbascose_g",
]);

const FAT_KEYS = new Set([
  "fat_saturated_g",
  "fat_mufa_g",
  "fat_pufa_g",
  "fat_trans_g",
  "total_fat_nlea_g",
  "cholesterol_mg",
  "omega3_g",
  "omega6_g",
  "ala_g",
  "epa_g",
  "dha_g",
  "dpa_g",
  "la_g",
  "aa_g",
]);

const AMINO_KEYS = new Set([
  "tryptophan_mg",
  "threonine_mg",
  "isoleucine_mg",
  "leucine_mg",
  "lysine_mg",
  "methionine_mg",
  "cystine_mg",
  "cysteine_g",
  "phenylalanine_mg",
  "tyrosine_mg",
  "valine_mg",
  "arginine_mg",
  "histidine_mg",
  "alanine_mg",
  "aspartic_acid_mg",
  "glutamic_acid_mg",
  "glycine_mg",
  "proline_mg",
  "serine_mg",
  "hydroxyproline_mg",
]);

const MINERAL_KEYS = new Set([
  "calcium_mg",
  "iron_mg",
  "magnesium_mg",
  "phosphorus_mg",
  "potassium_mg",
  "sodium_mg",
  "zinc_mg",
  "copper_mg",
  "manganese_mg",
  "selenium_mcg",
  "chromium_mcg",
  "fluoride_mcg",
  "iodine_mcg",
  "molybdenum_mcg",
]);

/** The order the important rows appear in; everything else sorts by label. */
const PRIORITY: Record<string, string[]> = {
  macros: [
    "kcal",
    "energy_kj",
    "protein_g",
    "fat_g",
    "carbs_g",
    "fiber_g",
    "fiber_soluble_g",
    "fiber_insoluble_g",
    "sugars_g",
    "sugars_added_g",
    "starch_g",
    "resistant_starch_g",
  ],
  fats: [
    "fat_saturated_g",
    "fat_mufa_g",
    "fat_pufa_g",
    "fat_trans_g",
    "cholesterol_mg",
    "omega3_g",
    "ala_g",
    "epa_g",
    "dha_g",
    "dpa_g",
    "omega6_g",
    "la_g",
    "aa_g",
  ],
  vitamins: [
    "vitamin_a_mcg",
    "vitamin_a_iu",
    "retinol_mcg",
    "beta_carotene_mcg",
    "alpha_carotene_mcg",
    "beta_cryptoxanthin_mcg",
    "lycopene_mcg",
    "lutein_zeaxanthin_mcg",
    "vitamin_b1_mg",
    "vitamin_b2_mg",
    "vitamin_b3_mg",
    "vitamin_b5_mg",
    "vitamin_b6_mg",
    "vitamin_b12_mcg",
    "folate_mcg",
    "vitamin_c_mg",
    "vitamin_d_mcg",
    "vitamin_e_mg",
    "vitamin_k_mcg",
    "choline_mg",
    "betaine_mg",
  ],
  minerals: [
    "calcium_mg",
    "iron_mg",
    "magnesium_mg",
    "phosphorus_mg",
    "potassium_mg",
    "sodium_mg",
    "zinc_mg",
    "copper_mg",
    "manganese_mg",
    "selenium_mcg",
    "chromium_mcg",
    "fluoride_mcg",
    "iodine_mcg",
    "molybdenum_mcg",
  ],
  amino: [
    "tryptophan_mg",
    "threonine_mg",
    "isoleucine_mg",
    "leucine_mg",
    "lysine_mg",
    "methionine_mg",
    "cystine_mg",
    "phenylalanine_mg",
    "tyrosine_mg",
    "valine_mg",
    "arginine_mg",
    "histidine_mg",
  ],
  other: [
    "water_ml",
    "alcohol_g",
    "caffeine_mg",
    "theobromine_mg",
    "oxalate_mg",
    "phytate_mg",
  ],
};

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function classify(key: string): string {
  if (MACRO_KEYS.has(key)) return "macros";
  if (
    FAT_KEYS.has(key) ||
    /^(sfa_|mufa_|pufa_|tfa_|fat_|cholesterol|omega|ala_|dha_|epa_|dpa_|la_|aa_)/.test(
      key,
    ) ||
    key.includes("fatty_acid")
  ) {
    return "fats";
  }
  if (AMINO_KEYS.has(key)) return "amino";
  if (MINERAL_KEYS.has(key)) return "minerals";
  if (
    /^(vitamin_|folate|folic|choline|betaine|retinol|alpha_carotene|beta_carotene|beta_cryptoxanthin|lycopene|lutein|tocopherol|tocotrienol|carotene|cryptoxanthin|zeaxanthin|biotin|25_hydroxycholecalciferol|cis_|trans_)/.test(
      key,
    ) ||
    key.includes("folate") ||
    key.includes("folic")
  ) {
    return "vitamins";
  }
  return "other";
}

/** Per-serving values for every nutrient stored on the matched ingredients. */
export function computeRecipePanel(
  ingredients: PanelIngredient[],
  servings: number,
): RecipePanel {
  const total: Record<string, number> = {};
  let matched = 0;

  for (const ingredient of ingredients) {
    if (
      !ingredient.nutrients ||
      ingredient.grams == null ||
      !Number.isFinite(ingredient.grams) ||
      ingredient.grams <= 0
    ) {
      continue;
    }
    matched += 1;
    if (ingredient.mappingStatus === "negligible") continue;

    const factor = ingredient.grams / 100;
    for (const [key, amount] of Object.entries(ingredient.nutrients)) {
      if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
      total[key] = (total[key] ?? 0) + amount * factor;
    }
  }

  const divisor =
    Number.isFinite(servings) && servings > 0 ? servings : 1;
  const values = Object.fromEntries(
    Object.entries(total).map(([key, value]) => [key, round(value / divisor)]),
  );

  const groups = groupPanel(values);
  return {
    values,
    groups,
    matched,
    counted: ingredients.length,
    count: groups.reduce((sum, group) => sum + group.rows.length, 0),
  };
}

/** Decode the JSON text stored in `food_nutrients.nutrients`. */
export function parsePanel(
  value: string | null | undefined,
): Record<string, number> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const panel: Record<string, number> = {};
    for (const [key, amount] of Object.entries(parsed)) {
      if (typeof amount === "number" && Number.isFinite(amount)) {
        panel[key] = amount;
      }
    }
    return panel;
  } catch {
    return null;
  }
}

/** Group the per-serving values for display, preserving a sensible order. */
export function groupPanel(values: Record<string, number>): NutrientGroup[] {
  const buckets = new Map<string, NutrientRow[]>();

  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) continue;
    const definition = DEFS[key];
    const unit = definition?.unit ?? key.split("_").pop() ?? "";
    const label =
      definition?.label ??
      key
        .slice(0, Math.max(0, key.length - unit.length - 1))
        .replace(/_/g, " ");

    const id = classify(key);
    const rows = buckets.get(id) ?? [];
    rows.push({ key, label, unit, value });
    buckets.set(id, rows);
  }

  return GROUPS.map((group) => {
    const rows = buckets.get(group.id) ?? [];
    const order = new Map(
      (PRIORITY[group.id] ?? []).map((key, index) => [key, index]),
    );
    rows.sort((a, b) => {
      const left = order.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const right = order.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      return left - right || a.label.localeCompare(b.label);
    });
    return { ...group, rows };
  }).filter((group) => group.rows.length > 0);
}

/**
 * Rescale every value, e.g. from per serving to per 100 g of the dish, and
 * rebuild the groups so the rows stay sorted.
 */
export function scalePanel(panel: RecipePanel, factor: number): RecipePanel {
  if (!Number.isFinite(factor) || factor <= 0) return panel;

  const values = Object.fromEntries(
    Object.entries(panel.values).map(([key, value]) => [
      key,
      round(value * factor),
    ]),
  );
  const groups = groupPanel(values);

  return {
    ...panel,
    values,
    groups,
    count: groups.reduce((sum, group) => sum + group.rows.length, 0),
  };
}

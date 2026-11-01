/**
 * USDA nutrient ids -> canonical keys, and the per-100 g panel builder.
 *
 * FoodData Central publishes ~150 nutrients per food. The app stores all of
 * them now, even though only the macros are on screen today: re-parsing the
 * CSV dumps later would mean re-seeding the whole catalog.
 *
 * Keys are `<nutrient>_<unit>` (the same shape as the Flutter app's
 * `micronutrients.dart`), so a key carries its unit and can be shown without
 * another lookup. Values are per 100 g.
 */

export type NutrientUnit = "kcal" | "kj" | "g" | "mg" | "mcg" | "iu" | "ml";

export interface NutrientDef {
  /** Human label, e.g. "Calcium, Ca". */
  label: string;
  unit: NutrientUnit;
  /** The USDA nutrient id this key came from (null for derived totals). */
  usdaId: string | null;
}

export interface NutrientPanel {
  /** Canonical key -> amount in the key's unit, per 100 g. */
  values: Record<string, number>;
  defs: Record<string, NutrientDef>;
}

export interface UsdaNutrientMeta {
  name: string;
  unit: string;
}

interface NutrientRule {
  /** Preference order: the first id present on the food wins. */
  ids: string[];
  key: string;
  label: string;
  unit: NutrientUnit;
  scale?: number;
}

/**
 * The nutrients the app already renders, plus every macro USDA publishes.
 * Rules come first; anything else with a real unit is kept under a key derived
 * from its own name, so fatty-acid isomers, tocopherols and the like survive
 * without a hand-written entry for each.
 */
const RULES: NutrientRule[] = [
  // Energy & macros. 2047/2048 are Atwater fallbacks for rows without 1008.
  { ids: ["1008", "2048", "2047"], key: "kcal", label: "Energy", unit: "kcal" },
  { ids: ["1062"], key: "energy_kj", label: "Energy", unit: "kj" },
  { ids: ["1003"], key: "protein_g", label: "Protein", unit: "g" },
  { ids: ["1004"], key: "fat_g", label: "Total lipid (fat)", unit: "g" },
  { ids: ["1005"], key: "carbs_g", label: "Carbohydrate, by difference", unit: "g" },
  { ids: ["1079"], key: "fiber_g", label: "Fiber, total dietary", unit: "g" },
  { ids: ["2000", "1063"], key: "sugars_g", label: "Sugars, total", unit: "g" },
  { ids: ["1235"], key: "sugars_added_g", label: "Sugars, added", unit: "g" },
  { ids: ["1009"], key: "starch_g", label: "Starch", unit: "g" },
  { ids: ["1010"], key: "sucrose_g", label: "Sucrose", unit: "g" },
  { ids: ["1011"], key: "glucose_g", label: "Glucose", unit: "g" },
  { ids: ["1012"], key: "fructose_g", label: "Fructose", unit: "g" },
  { ids: ["1013"], key: "lactose_g", label: "Lactose", unit: "g" },
  { ids: ["1014"], key: "maltose_g", label: "Maltose", unit: "g" },
  { ids: ["1075"], key: "galactose_g", label: "Galactose", unit: "g" },
  { ids: ["1051"], key: "water_ml", label: "Water", unit: "ml" },
  { ids: ["1018"], key: "alcohol_g", label: "Alcohol, ethyl", unit: "g" },
  { ids: ["1057"], key: "caffeine_mg", label: "Caffeine", unit: "mg" },
  { ids: ["1058"], key: "theobromine_mg", label: "Theobromine", unit: "mg" },

  // Fats.
  { ids: ["1258"], key: "fat_saturated_g", label: "Fatty acids, total saturated", unit: "g" },
  { ids: ["1292"], key: "fat_mufa_g", label: "Fatty acids, total monounsaturated", unit: "g" },
  { ids: ["1293"], key: "fat_pufa_g", label: "Fatty acids, total polyunsaturated", unit: "g" },
  { ids: ["1257"], key: "fat_trans_g", label: "Fatty acids, total trans", unit: "g" },
  { ids: ["1253"], key: "cholesterol_mg", label: "Cholesterol", unit: "mg" },
  { ids: ["1404"], key: "ala_g", label: "ALA (alpha-linolenic)", unit: "g" },
  { ids: ["1278"], key: "epa_g", label: "EPA (eicosapentaenoic)", unit: "g" },
  { ids: ["1272"], key: "dha_g", label: "DHA (docosahexaenoic)", unit: "g" },
  { ids: ["1280"], key: "dpa_g", label: "DPA (docosapentaenoic)", unit: "g" },
  { ids: ["1316"], key: "la_g", label: "LA (linoleic)", unit: "g" },
  { ids: ["1271"], key: "aa_g", label: "AA (arachidonic)", unit: "g" },

  // Amino acids (USDA publishes grams; the app tracks milligrams).
  { ids: ["1210"], key: "tryptophan_mg", label: "Tryptophan", unit: "mg", scale: 1000 },
  { ids: ["1211"], key: "threonine_mg", label: "Threonine", unit: "mg", scale: 1000 },
  { ids: ["1212"], key: "isoleucine_mg", label: "Isoleucine", unit: "mg", scale: 1000 },
  { ids: ["1213"], key: "leucine_mg", label: "Leucine", unit: "mg", scale: 1000 },
  { ids: ["1214"], key: "lysine_mg", label: "Lysine", unit: "mg", scale: 1000 },
  { ids: ["1215"], key: "methionine_mg", label: "Methionine", unit: "mg", scale: 1000 },
  { ids: ["1216"], key: "cystine_mg", label: "Cystine", unit: "mg", scale: 1000 },
  { ids: ["1217"], key: "phenylalanine_mg", label: "Phenylalanine", unit: "mg", scale: 1000 },
  { ids: ["1218"], key: "tyrosine_mg", label: "Tyrosine", unit: "mg", scale: 1000 },
  { ids: ["1219"], key: "valine_mg", label: "Valine", unit: "mg", scale: 1000 },
  { ids: ["1220"], key: "arginine_mg", label: "Arginine", unit: "mg", scale: 1000 },
  { ids: ["1221"], key: "histidine_mg", label: "Histidine", unit: "mg", scale: 1000 },
  { ids: ["1222"], key: "alanine_mg", label: "Alanine", unit: "mg", scale: 1000 },
  { ids: ["1223"], key: "aspartic_acid_mg", label: "Aspartic acid", unit: "mg", scale: 1000 },
  { ids: ["1224"], key: "glutamic_acid_mg", label: "Glutamic acid", unit: "mg", scale: 1000 },
  { ids: ["1225"], key: "glycine_mg", label: "Glycine", unit: "mg", scale: 1000 },
  { ids: ["1226"], key: "proline_mg", label: "Proline", unit: "mg", scale: 1000 },
  { ids: ["1227"], key: "serine_mg", label: "Serine", unit: "mg", scale: 1000 },
  { ids: ["1228"], key: "hydroxyproline_mg", label: "Hydroxyproline", unit: "mg", scale: 1000 },

  // Vitamins.
  { ids: ["1106"], key: "vitamin_a_mcg", label: "Vitamin A, RAE", unit: "mcg" },
  { ids: ["1104"], key: "vitamin_a_iu", label: "Vitamin A, IU", unit: "iu" },
  { ids: ["1105"], key: "retinol_mcg", label: "Retinol", unit: "mcg" },
  { ids: ["1107"], key: "beta_carotene_mcg", label: "Carotene, beta", unit: "mcg" },
  { ids: ["1108"], key: "alpha_carotene_mcg", label: "Carotene, alpha", unit: "mcg" },
  { ids: ["1120"], key: "beta_cryptoxanthin_mcg", label: "Cryptoxanthin, beta", unit: "mcg" },
  { ids: ["1122"], key: "lycopene_mcg", label: "Lycopene", unit: "mcg" },
  { ids: ["1123"], key: "lutein_zeaxanthin_mcg", label: "Lutein + zeaxanthin", unit: "mcg" },
  { ids: ["1165"], key: "vitamin_b1_mg", label: "Thiamin", unit: "mg" },
  { ids: ["1166"], key: "vitamin_b2_mg", label: "Riboflavin", unit: "mg" },
  { ids: ["1167"], key: "vitamin_b3_mg", label: "Niacin", unit: "mg" },
  { ids: ["1170"], key: "vitamin_b5_mg", label: "Pantothenic acid", unit: "mg" },
  { ids: ["1175"], key: "vitamin_b6_mg", label: "Vitamin B-6", unit: "mg" },
  { ids: ["1178"], key: "vitamin_b12_mcg", label: "Vitamin B-12", unit: "mcg" },
  { ids: ["1190", "1177"], key: "folate_mcg", label: "Folate, DFE", unit: "mcg" },
  { ids: ["1162"], key: "vitamin_c_mg", label: "Vitamin C, total ascorbic acid", unit: "mg" },
  { ids: ["1114"], key: "vitamin_d_mcg", label: "Vitamin D (D2 + D3)", unit: "mcg" },
  { ids: ["1110"], key: "vitamin_d_iu", label: "Vitamin D (D2 + D3), IU", unit: "iu" },
  { ids: ["1109"], key: "vitamin_e_mg", label: "Vitamin E (alpha-tocopherol)", unit: "mg" },
  { ids: ["1185"], key: "vitamin_k_mcg", label: "Vitamin K (phylloquinone)", unit: "mcg" },
  { ids: ["1180"], key: "choline_mg", label: "Choline, total", unit: "mg" },
  { ids: ["1198"], key: "betaine_mg", label: "Betaine", unit: "mg" },

  // Minerals.
  { ids: ["1087"], key: "calcium_mg", label: "Calcium, Ca", unit: "mg" },
  { ids: ["1089"], key: "iron_mg", label: "Iron, Fe", unit: "mg" },
  { ids: ["1090"], key: "magnesium_mg", label: "Magnesium, Mg", unit: "mg" },
  { ids: ["1091"], key: "phosphorus_mg", label: "Phosphorus, P", unit: "mg" },
  { ids: ["1092"], key: "potassium_mg", label: "Potassium, K", unit: "mg" },
  { ids: ["1093"], key: "sodium_mg", label: "Sodium, Na", unit: "mg" },
  { ids: ["1095"], key: "zinc_mg", label: "Zinc, Zn", unit: "mg" },
  { ids: ["1098"], key: "copper_mg", label: "Copper, Cu", unit: "mg" },
  { ids: ["1101"], key: "manganese_mg", label: "Manganese, Mn", unit: "mg" },
  { ids: ["1103"], key: "selenium_mcg", label: "Selenium, Se", unit: "mcg" },
  { ids: ["1096"], key: "chromium_mcg", label: "Chromium, Cr", unit: "mcg" },
  { ids: ["1099"], key: "fluoride_mcg", label: "Fluoride, F", unit: "mcg" },
  { ids: ["1100"], key: "iodine_mcg", label: "Iodine, I", unit: "mcg" },
  { ids: ["1102"], key: "molybdenum_mcg", label: "Molybdenum, Mo", unit: "mcg" },

  // Other tracked compounds.
  { ids: ["1041"], key: "oxalate_mg", label: "Oxalic acid", unit: "mg" },
  { ids: ["1042"], key: "phytate_mg", label: "Phytic acid", unit: "mg" },
];

const UNIT_ALIASES: Record<string, NutrientUnit> = {
  G: "g",
  MG: "mg",
  UG: "mcg",
  KCAL: "kcal",
  KJ: "kj",
  IU: "iu",
};

/** Non-nutrient columns that happen to live in food_nutrient.csv. */
const SKIP_NAME =
  /^(ash|nitrogen|adjusted nitrogen|solids|solids, non-fat|solids, soluble|specific gravity|ph|fiber, crude)/i;

const RULE_BY_KEY = new Map(
  RULES.map((rule) => [
    rule.key,
    { label: rule.label, unit: rule.unit, usdaId: rule.ids[0] ?? null },
  ]),
);

/** Unit letter for a USDA unit_name; null for units we do not store. */
export function unitFromUsda(unitName: string): NutrientUnit | null {
  return UNIT_ALIASES[(unitName ?? "").trim().toUpperCase()] ?? null;
}

/** `Calcium, Ca` -> `calcium_ca_mg`. Only used for nutrients without a rule. */
export function autoNutrientKey(name: string, unit: NutrientUnit): string {
  const base = name
    .toLowerCase()
    .replace(/[µμ]g/g, "mcg")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base}_${unit}`;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function isSkippedNutrientName(name: string): boolean {
  return SKIP_NAME.test(name.trim());
}

/**
 * Turn a food's raw nutrient ids into the stored panel.
 *
 * Values follow the id rules first (so `1008`, `2048` and `2047` all land on
 * `kcal`), then every remaining id with a real unit is kept under a derived
 * key. Missing is still missing: a nutrient with no amount is simply absent.
 */
export function buildNutrientPanel(
  raw: ReadonlyMap<string, number>,
  meta: ReadonlyMap<string, UsdaNutrientMeta>,
): NutrientPanel {
  const values: Record<string, number> = {};
  const defs: Record<string, NutrientDef> = {};
  const consumed = new Set<string>();

  for (const rule of RULES) {
    for (const id of rule.ids) {
      const amount = raw.get(id);
      if (amount == null || !Number.isFinite(amount)) continue;
      values[rule.key] = round(amount * (rule.scale ?? 1));
      defs[rule.key] = {
        label: rule.label,
        unit: rule.unit,
        usdaId: id,
      };
      for (const alternate of rule.ids) consumed.add(alternate);
      break;
    }
  }

  for (const [id, amount] of raw) {
    if (consumed.has(id) || !Number.isFinite(amount)) continue;
    const info = meta.get(id);
    if (!info || isSkippedNutrientName(info.name)) continue;
    const unit = unitFromUsda(info.unit);
    if (!unit) continue;
    let key = autoNutrientKey(info.name, unit);
    if (values[key] != null) key = `${key}_${id}`;
    values[key] = round(amount);
    defs[key] = { label: info.name, unit, usdaId: id };
  }

  // The app's fat panel shows omega totals; USDA has no single row for them.
  const sum = (...keys: string[]) => {
    let total = 0;
    for (const key of keys) total += values[key] ?? 0;
    return total;
  };
  const has = (...keys: string[]) => keys.some((key) => values[key] != null);

  if (has("ala_g", "epa_g", "dha_g", "dpa_g")) {
    values.omega3_g = round(sum("ala_g", "epa_g", "dha_g", "dpa_g"));
    defs.omega3_g = {
      label: "Omega-3 (ALA + EPA + DPA + DHA)",
      unit: "g",
      usdaId: null,
    };
  }
  if (has("la_g", "aa_g")) {
    values.omega6_g = round(sum("la_g", "aa_g"));
    defs.omega6_g = {
      label: "Omega-6 (LA + AA)",
      unit: "g",
      usdaId: null,
    };
  }

  return { values, defs };
}

/** Labels for keys added outside the USDA rules (hand-curated supplements). */
export function defaultNutrientDef(key: string): NutrientDef {
  const known = RULE_BY_KEY.get(key);
  if (known) return known;
  const unit = key.split("_").pop() as NutrientUnit;
  const label = key
    .slice(0, key.length - unit.length - 1)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return { label, unit, usdaId: null };
}

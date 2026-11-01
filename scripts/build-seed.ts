/**
 * Build the local food catalog from the USDA FoodData Central CSV dumps that
 * already live in this repo (data/usda). No API key, no network.
 *
 *   npm run seed:foods
 *
 * Selection is deterministic: every curated common ingredient is guaranteed a
 * row, then generic foods (short descriptions, complete macros, household
 * portions) fill the rest of the catalog.
 */

import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";

import {
  buildNutrientPanel,
  defaultNutrientDef,
  type NutrientDef,
  type UsdaNutrientMeta,
} from "../lib/nutrition/nutrients";
import { parsePortionUnit, type UnitId } from "../lib/nutrition/units";

const ROOT = resolve(import.meta.dirname, "..", "..");
const SR = join(ROOT, "data/usda/FoodData_Central_sr_legacy_food_csv_2018-04");
const FOUNDATION = join(
  ROOT,
  "data/usda/FoodData_Central_foundation_food_csv_2025-12-18",
);
const OUT = resolve(import.meta.dirname, "..", "seed", "foods.json");
const DEFS_OUT = resolve(import.meta.dirname, "..", "seed", "nutrients.json");
const SUPPLEMENTS = resolve(import.meta.dirname, "..", "seed", "supplements.json");

const TARGET = 1400;

const NUTRIENTS = {
  kcal: ["1008", "2048", "2047"],
  protein: ["1003"],
  fat: ["1004"],
  carbs: ["1005"],
  fiber: ["1079"],
  sugar: ["2000", "1063"],
  sodium: ["1093"],
};

interface Row {
  [key: string]: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

async function forEachRow(
  path: string,
  fn: (row: Row) => void,
): Promise<void> {
  if (!existsSync(path)) {
    throw new Error(`Missing USDA file: ${path}`);
  }
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let header: string[] | null = null;
  for await (const line of rl) {
    if (!line) continue;
    const cells = parseCsvLine(line);
    if (!header) {
      header = cells.map((c) => c.replace(/^\uFEFF/, ""));
      continue;
    }
    if (cells.length < 2) continue;
    const row: Row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cells[i] ?? "";
    fn(row);
  }
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    // Keep parenthetical content: USDA hides "chops" and "garbanzo beans" in
    // parentheses, and dropping them made those foods impossible to match.
    .replace(/[()]/g, " ")
    .replace(/,/g, " ")
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whole-token matching. `includes("mature seeds")` also matches "immature
 * seeds", which quietly put immature black-eyed peas in the catalog when the
 * curated entry asked for the mature ones.
 */
function hasAllTokens(text: string, tokens: string[]): boolean {
  const padded = ` ${text} `;
  return tokens.every((token) => padded.includes(` ${token} `));
}

interface FoodRow {
  fdcId: string;
  description: string;
  category: string;
  dataType: string;
  /** The handful of macros the catalog has always stored as columns. */
  nutrients: Record<string, number>;
  /** Every nutrient in the USDA CSV, keyed by nutrient id. */
  rawNutrients: Map<string, number>;
  /** Canonical key -> amount, filled for the foods that make the catalog. */
  panel?: Record<string, number>;
  portions: { label: string; amount: number; unit: UnitId; gramWeight: number }[];
  commonName?: string;
  aliases?: string[];
  source?: string;
}

interface SupplementFood {
  fdcId: string;
  description: string;
  commonName?: string;
  aliases?: string[];
  category: string;
  dataType: string;
  source: string;
  nutrients: Record<string, number>;
  portions: { label: string; amount: number; unit: UnitId; gramWeight: number }[];
}

/* -------------------------------------------------------------------------- */
/*  Curated common ingredients                                                */
/* -------------------------------------------------------------------------- */

const CURATED: { name: string; tokens: string[]; aliases?: string[] }[] = [
  { name: "chicken breast", tokens: ["chicken", "breast", "meat only", "cooked", "roasted"] },
  { name: "chicken breast raw", tokens: ["chicken", "breast", "meat only", "raw"] },
  { name: "chicken thigh", tokens: ["chicken", "thigh", "meat only", "cooked"] },
  { name: "rotisserie chicken", tokens: ["chicken", "roasting", "meat only", "cooked", "roasted"] },
  { name: "ground turkey", tokens: ["turkey", "ground", "cooked"] },
  { name: "ground beef", tokens: ["beef", "ground", "90%", "lean", "patty", "cooked"] },
  { name: "ground beef 80/20", tokens: ["beef", "ground", "80%", "lean", "cooked"] },
  { name: "beef steak", tokens: ["beef", "steak", "cooked"] },
  { name: "pork chop", tokens: ["pork", "loin", "chops", "cooked", "broiled"] },
  { name: "bacon", tokens: ["pork", "cured", "bacon", "cooked"] },
  {
    name: "horse meat",
    tokens: ["game meat", "horse", "raw"],
    aliases: ["horse", "horsemeat"],
  },
  { name: "salmon", tokens: ["salmon", "cooked", "dry heat"] },
  { name: "salmon raw", tokens: ["salmon", "atlantic", "farmed", "raw"] },
  { name: "canned tuna", tokens: ["tuna", "light", "canned", "water"] },
  { name: "shrimp", tokens: ["shrimp", "cooked"] },
  { name: "egg", tokens: ["egg", "whole", "cooked"] },
  { name: "egg raw", tokens: ["egg", "whole", "raw", "fresh"] },
  { name: "egg white", tokens: ["egg white", "raw", "fresh"] },
  { name: "whole milk", tokens: ["milk", "whole", "3 25%"] },
  { name: "2% milk", tokens: ["milk", "reduced fat", "2%"] },
  { name: "skim milk", tokens: ["milk", "nonfat"] },
  { name: "greek yogurt", tokens: ["yogurt", "greek", "plain", "nonfat"] },
  { name: "yogurt", tokens: ["yogurt", "plain", "whole milk"] },
  { name: "cottage cheese", tokens: ["cheese", "cottage", "lowfat", "2%"] },
  { name: "cheddar cheese", tokens: ["cheese", "cheddar"] },
  { name: "mozzarella", tokens: ["cheese", "mozzarella", "part skim"] },
  { name: "parmesan", tokens: ["cheese", "parmesan", "hard"] },
  { name: "feta", tokens: ["cheese", "feta"] },
  { name: "cream cheese", tokens: ["cheese", "cream"] },
  { name: "butter", tokens: ["butter", "salted"] },
  { name: "olive oil", tokens: ["oil", "olive", "salad", "cooking"] },
  { name: "canola oil", tokens: ["oil", "canola"] },
  { name: "coconut oil", tokens: ["oil", "coconut"] },
  { name: "avocado", tokens: ["avocados", "raw", "california"] },
  { name: "almonds", tokens: ["nuts", "almonds"] },
  { name: "walnuts", tokens: ["nuts", "walnuts", "english"] },
  { name: "peanuts", tokens: ["peanuts", "all types", "raw"] },
  { name: "peanut butter", tokens: ["peanut butter", "smooth"] },
  { name: "chia seeds", tokens: ["seeds", "chia"] },
  { name: "flaxseed", tokens: ["seeds", "flaxseed"] },
  { name: "sunflower seeds", tokens: ["seeds", "sunflower", "kernels"] },
  { name: "pumpkin seeds", tokens: ["seeds", "pumpkin", "kernels"] },
  { name: "sesame seeds", tokens: ["seeds", "sesame"] },
  { name: "oats", tokens: ["oats"] },
  { name: "quinoa", tokens: ["quinoa", "cooked"] },
  { name: "brown rice", tokens: ["rice", "brown", "long grain", "cooked"] },
  { name: "white rice", tokens: ["rice", "white", "long grain", "regular", "cooked"] },
  { name: "pasta", tokens: ["pasta", "cooked", "enriched"] },
  { name: "whole wheat pasta", tokens: ["pasta", "whole wheat", "cooked"] },
  { name: "bread", tokens: ["bread", "white", "commercially prepared"] },
  { name: "whole wheat bread", tokens: ["bread", "whole wheat", "commercially prepared"] },
  { name: "tortilla", tokens: ["tortillas", "flour", "shelf stable"] },
  { name: "corn tortilla", tokens: ["tortillas", "corn"] },
  { name: "lentils", tokens: ["lentils", "raw"] },
  {
    name: "brown lentils",
    tokens: ["lentils", "raw"],
    aliases: ["brown lentils", "green lentils", "whole lentils"],
  },
  {
    name: "red lentils",
    tokens: ["lentils", "pink or red", "raw"],
    aliases: ["red lentils", "pink lentils", "split red lentils"],
  },
  { name: "cooked lentils", tokens: ["lentils", "cooked", "boiled"] },
  {
    name: "split peas",
    tokens: ["peas", "split", "mature seeds", "cooked"],
    aliases: ["yellow split peas", "green split peas"],
  },
  { name: "chickpeas", tokens: ["chickpeas", "canned", "drained"] },
  {
    name: "chickpeas dry",
    tokens: ["chickpeas", "mature seeds", "raw"],
    aliases: ["dried chickpeas", "garbanzo beans"],
  },
  { name: "black beans", tokens: ["beans", "black", "canned"] },
  {
    name: "black beans dry",
    tokens: ["beans", "black", "mature seeds", "raw"],
    aliases: ["dried black beans"],
  },
  { name: "kidney beans", tokens: ["beans", "kidney", "canned"] },
  { name: "pinto beans", tokens: ["beans", "pinto", "canned"] },
  { name: "white beans", tokens: ["beans", "white", "canned"] },
  {
    name: "cannellini beans",
    tokens: ["beans", "white", "mature seeds", "raw"],
    aliases: ["cannellini", "white kidney beans"],
  },
  {
    name: "navy beans",
    tokens: ["beans", "navy", "mature seeds", "raw"],
    aliases: ["haricot beans"],
  },
  {
    name: "great northern beans",
    tokens: ["beans", "great northern", "raw"],
  },
  {
    name: "pink beans",
    tokens: ["beans", "pink", "mature seeds", "raw"],
  },
  {
    name: "cranberry beans",
    tokens: ["beans", "cranberry", "raw"],
    aliases: ["roman beans", "borlotti beans"],
  },
  {
    name: "small white beans",
    tokens: ["beans", "small white", "raw"],
  },
  {
    name: "yellow beans",
    tokens: ["beans", "yellow", "mature seeds", "raw"],
  },
  {
    name: "adzuki beans",
    tokens: ["beans", "adzuki", "raw"],
    aliases: ["azuki beans", "aduki beans"],
  },
  {
    name: "lima beans",
    tokens: ["lima beans", "raw"],
    aliases: ["butter beans"],
  },
  {
    name: "mung beans",
    tokens: ["mung beans", "mature seeds", "raw"],
    aliases: ["moong beans", "green gram"],
  },
  {
    name: "fava beans",
    tokens: ["broadbeans", "fava", "mature seeds", "raw"],
    aliases: ["broad beans", "faba beans"],
  },
  {
    name: "black-eyed peas",
    tokens: ["cowpeas", "blackeyes", "mature seeds", "raw"],
    aliases: ["black eyed peas", "cowpeas"],
  },
  {
    name: "soybeans",
    tokens: ["soybeans", "mature seeds", "raw"],
    aliases: ["soya beans", "edamame beans"],
  },
  { name: "edamame", tokens: ["edamame", "frozen"] },
  { name: "tofu", tokens: ["tofu", "firm", "prepared"] },
  { name: "tempeh", tokens: ["tempeh"] },
  { name: "green peas", tokens: ["peas", "green", "frozen"] },
  { name: "green beans", tokens: ["beans", "snap", "green", "raw"] },
  { name: "broccoli", tokens: ["broccoli", "raw"] },
  { name: "spinach", tokens: ["spinach", "raw"] },
  { name: "kale", tokens: ["kale", "raw"] },
  { name: "romaine", tokens: ["lettuce", "romaine", "raw"] },
  { name: "cabbage", tokens: ["cabbage", "raw"] },
  { name: "carrots", tokens: ["carrots", "raw"] },
  { name: "sweet potato", tokens: ["sweet potato", "raw"] },
  { name: "potato", tokens: ["potatoes", "flesh and skin", "raw"] },
  { name: "tomato", tokens: ["tomatoes", "red", "ripe", "raw"] },
  { name: "cucumber", tokens: ["cucumber", "with peel", "raw"] },
  { name: "bell pepper", tokens: ["peppers", "sweet", "red", "raw"] },
  { name: "onion", tokens: ["onions", "raw"] },
  { name: "garlic", tokens: ["garlic", "raw"] },
  { name: "ginger", tokens: ["ginger root", "raw"] },
  { name: "mushrooms", tokens: ["mushrooms", "white", "raw"] },
  { name: "zucchini", tokens: ["squash", "summer", "zucchini", "raw"] },
  { name: "cauliflower", tokens: ["cauliflower", "raw"] },
  { name: "brussels sprouts", tokens: ["brussels sprouts", "raw"] },
  { name: "asparagus", tokens: ["asparagus", "raw"] },
  { name: "beet", tokens: ["beets", "raw"] },
  { name: "corn", tokens: ["corn", "sweet", "yellow", "raw"] },
  { name: "banana", tokens: ["bananas", "raw"] },
  { name: "apple", tokens: ["apples", "raw", "with skin"] },
  { name: "orange", tokens: ["oranges", "raw"] },
  { name: "blueberries", tokens: ["blueberries", "raw"] },
  { name: "strawberries", tokens: ["strawberries", "raw"] },
  { name: "raspberries", tokens: ["raspberries", "raw"] },
  { name: "grapes", tokens: ["grapes", "red or green", "raw"] },
  { name: "mango", tokens: ["mangos", "raw"] },
  { name: "pineapple", tokens: ["pineapple", "raw"] },
  { name: "dates", tokens: ["dates", "medjool"] },
  { name: "raisins", tokens: ["raisins", "seedless"] },
  { name: "honey", tokens: ["honey"] },
  { name: "maple syrup", tokens: ["syrups", "maple"] },
  { name: "sugar", tokens: ["sugars", "granulated"] },
  { name: "cocoa powder", tokens: ["cocoa", "dry powder", "unsweetened"] },
  { name: "dark chocolate", tokens: ["candies", "semisweet", "chocolate"] },
  { name: "flour", tokens: ["wheat flour", "all purpose", "enriched"] },
  { name: "whole wheat flour", tokens: ["wheat flour", "whole grain"] },
  { name: "cornmeal", tokens: ["cornmeal", "whole grain"] },
  { name: "cornstarch", tokens: ["cornstarch"] },
  { name: "salt", tokens: ["salt", "table"] },
  { name: "black pepper", tokens: ["pepper", "black"] },
  { name: "cumin", tokens: ["cumin", "seed"] },
  { name: "paprika", tokens: ["paprika"] },
  { name: "cinnamon", tokens: ["cinnamon", "ground"] },
  { name: "turmeric", tokens: ["turmeric", "ground"] },
  { name: "oregano", tokens: ["oregano", "dried"] },
  { name: "basil", tokens: ["basil", "fresh"] },
  { name: "parsley", tokens: ["parsley", "fresh"] },
  { name: "cilantro", tokens: ["coriander", "leaves", "raw"] },
  { name: "thyme", tokens: ["thyme", "fresh"] },
  { name: "rosemary", tokens: ["rosemary", "fresh"] },
  { name: "chili powder", tokens: ["chili powder"] },
  { name: "soy sauce", tokens: ["soy sauce", "made from soy"] },
  { name: "vinegar", tokens: ["vinegar", "cider"] },
  { name: "mustard", tokens: ["mustard", "prepared", "yellow"] },
  { name: "mayonnaise", tokens: ["mayonnaise", "regular"] },
  { name: "hummus", tokens: ["hummus", "commercial"] },
  { name: "salsa", tokens: ["salsa", "ready to serve"] },
  { name: "tomato paste", tokens: ["tomato paste", "canned"] },
  { name: "coconut milk", tokens: ["coconut milk", "raw"] },
  { name: "almond milk", tokens: ["almond milk", "unsweetened"] },
  { name: "oat milk", tokens: ["oat milk"] },
  { name: "soy milk", tokens: ["soymilk", "unsweetened"] },
  { name: "whey protein", tokens: ["whey", "protein", "powder"] },
  { name: "sour cream", tokens: ["cream", "sour", "cultured"] },
  { name: "heavy cream", tokens: ["cream", "heavy", "whipping"] },
  { name: "barley", tokens: ["barley", "pearled", "raw"] },
];

/* -------------------------------------------------------------------------- */
/*  Load                                                                      */
/* -------------------------------------------------------------------------- */

async function loadReference() {
  const categories = new Map<string, string>();
  for (const dir of [SR, FOUNDATION]) {
    const path = join(dir, "food_category.csv");
    if (!existsSync(path)) continue;
    await forEachRow(path, (r) => {
      categories.set(r.id, r.description);
    });
  }
  return categories;
}

async function loadFoods(): Promise<Map<string, FoodRow>> {
  const categories = await loadReference();
  const foods = new Map<string, FoodRow>();

  for (const [dir, dataType] of [
    [SR, "sr_legacy_food"],
    [FOUNDATION, "foundation_food"],
  ] as const) {
    await forEachRow(join(dir, "food.csv"), (r) => {
      if (r.data_type !== dataType) return;
      const category = categories.get(r.food_category_id) ?? "";
      if (category === "Baby Foods" || category === "Fast Foods") return;
      foods.set(r.fdc_id, {
        fdcId: r.fdc_id,
        description: r.description,
        category,
        dataType,
        nutrients: {},
        rawNutrients: new Map(),
        portions: [],
      });
    });
  }
  return foods;
}

async function loadNutrientMeta(): Promise<Map<string, UsdaNutrientMeta>> {
  const meta = new Map<string, UsdaNutrientMeta>();
  for (const dir of [SR, FOUNDATION]) {
    await forEachRow(join(dir, "nutrient.csv"), (r) => {
      if (!r.id || meta.has(r.id)) return;
      meta.set(r.id, { name: r.name, unit: r.unit_name ?? "" });
    });
  }
  return meta;
}

async function loadNutrients(foods: Map<string, FoodRow>) {
  for (const dir of [SR, FOUNDATION]) {
    await forEachRow(join(dir, "food_nutrient.csv"), (r) => {
      const food = foods.get(r.fdc_id);
      if (!food) return;
      const amount = Number(r.amount);
      if (!Number.isFinite(amount)) return;
      // Keep the first published amount per id; later rows are usually the
      // same nutrient from another derivation/source.
      if (!food.rawNutrients.has(r.nutrient_id)) {
        food.rawNutrients.set(r.nutrient_id, amount);
      }
      for (const [key, ids] of Object.entries(NUTRIENTS)) {
        if (!ids.includes(r.nutrient_id)) continue;
        // Later ids in the list are fallbacks; keep the first value seen for
        // the preferred nutrient id.
        if (food.nutrients[key] == null) food.nutrients[key] = amount;
      }
    });
  }
}

async function loadPortions(foods: Map<string, FoodRow>) {
  const units = new Map<string, string>();
  await forEachRow(join(SR, "measure_unit.csv"), (r) => {
    units.set(r.id, r.name);
  });

  const seen = new Set<string>();
  for (const dir of [SR, FOUNDATION]) {
    await forEachRow(join(dir, "food_portion.csv"), (r) => {
      const food = foods.get(r.fdc_id);
      if (!food) return;
      const gramWeight = Number(r.gram_weight);
      const amount = Number(r.amount);
      if (!Number.isFinite(gramWeight) || gramWeight <= 0) return;
      if (!Number.isFinite(amount) || amount <= 0) return;

      const measureName = units.get(r.measure_unit_id) ?? "";
      const unit = parsePortionUnit(
        measureName,
        r.portion_description,
        r.modifier,
      );
      if (!unit) return;

      const descriptor = [r.portion_description, r.modifier]
        .filter(Boolean)
        .join(", ")
        .trim();
      const label = `${amount === 1 ? "1" : amount} ${describeUnit(unit)}${descriptor && !descriptor.toLowerCase().startsWith(describeUnit(unit)) ? `, ${descriptor}` : ""}`;
      const key = `${food.fdcId}|${unit}|${amount}|${gramWeight}`;
      if (seen.has(key)) return;
      seen.add(key);
      food.portions.push({ label, amount, unit, gramWeight });
    });
  }

  for (const food of foods.values()) {
    food.portions.sort((a, b) => Number(b.amount === 1) - Number(a.amount === 1));
  }
}

function describeUnit(unit: UnitId): string {
  const names: Partial<Record<UnitId, string>> = {
    g: "g",
    kg: "kg",
    oz: "oz",
    lb: "lb",
    ml: "ml",
    l: "L",
    tsp: "tsp",
    tbsp: "tbsp",
    cup: "cup",
    floz: "fl oz",
    piece: "piece",
    slice: "slice",
    clove: "clove",
    medium: "medium",
    small: "small",
    large: "large",
    serving: "serving",
    can: "can",
    bunch: "bunch",
    packet: "packet",
    fillet: "fillet",
    stalk: "stalk",
    ear: "ear",
    head: "head",
    link: "link",
  };
  return names[unit] ?? unit;
}

/* -------------------------------------------------------------------------- */
/*  Select                                                                    */
/* -------------------------------------------------------------------------- */

function hasMacros(food: FoodRow): boolean {
  const n = food.nutrients;
  return (
    n.kcal != null && n.protein != null && n.carbs != null && n.fat != null
  );
}

function commaCount(text: string): number {
  return (text.match(/,/g) ?? []).length;
}

function score(food: FoodRow): number {
  let value = 0;
  if (food.dataType === "foundation_food") value += 60;
  value -= commaCount(food.description) * 10;
  value -= Math.min(food.description.length, 140) / 8;
  value += Math.min(food.portions.length, 6) * 4;
  const n = food.nutrients;
  if (n.fiber != null) value += 6;
  return value;
}

function loadSupplements(): SupplementFood[] {
  if (!existsSync(SUPPLEMENTS)) return [];
  return JSON.parse(readFileSync(SUPPLEMENTS, "utf8")) as SupplementFood[];
}

function supplementRow(supp: SupplementFood): FoodRow {
  const panel = supp.nutrients;
  return {
    fdcId: supp.fdcId,
    description: supp.description,
    commonName: supp.commonName,
    aliases: supp.aliases,
    category: supp.category,
    dataType: supp.dataType,
    source: supp.source,
    nutrients: {
      kcal: panel.kcal,
      protein: panel.protein_g,
      carbs: panel.carbs_g,
      fat: panel.fat_g,
      fiber: panel.fiber_g,
      sugar: panel.sugars_g,
      sodium: panel.sodium_mg,
    },
    rawNutrients: new Map(),
    panel,
    portions: supp.portions,
  };
}

function main() {
  console.log("Reading USDA FoodData Central CSVs…");
  const started = Date.now();
  const foods = new Map<string, FoodRow>();

  return (async () => {
    const loaded = await loadFoods();
    for (const [k, v] of loaded) foods.set(k, v);
    console.log(`  foods: ${foods.size}`);
    const nutrientMeta = await loadNutrientMeta();
    await loadNutrients(foods);
    await loadPortions(foods);
    console.log(
      `  parsed in ${((Date.now() - started) / 1000).toFixed(1)}s (${nutrientMeta.size} nutrient definitions)`,
    );

    const usable = [...foods.values()].filter(hasMacros);
    console.log(`  with complete macros: ${usable.length}`);

    // Curated matches always make the cut and get a short display name.
    const byId = new Map(usable.map((f) => [f.fdcId, f]));
    const curatedIds = new Set<string>();
    const aliasesById = new Map<string, Set<string>>();
    const missing: string[] = [];

    for (const entry of CURATED) {
      let best: FoodRow | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const food of usable) {
        const text = normalise(food.description);
        if (!hasAllTokens(text, entry.tokens)) continue;
        const candidate =
          commaCount(food.description) * 10 +
          food.description.length / 40 +
          (food.dataType === "foundation_food" ? -6 : 0) +
          // A fiber site must prefer the row that actually publishes fiber.
          (food.nutrients.fiber == null ? 10 : 0) -
          Math.min(food.portions.length, 5) * 1.5;
        if (candidate < bestScore) {
          bestScore = candidate;
          best = food;
        }
      }
      if (!best) {
        missing.push(entry.name);
        continue;
      }
      if (!best.commonName) best.commonName = entry.name;
      curatedIds.add(best.fdcId);

      // Several curated names can share one USDA row (brown/green lentils).
      // Keep every alias in searchText so each name still finds it.
      const aliases = aliasesById.get(best.fdcId) ?? new Set<string>();
      aliases.add(entry.name);
      for (const alias of entry.aliases ?? []) aliases.add(alias);
      aliasesById.set(best.fdcId, aliases);
    }

    if (missing.length) {
      console.warn(`  curated entries with no match: ${missing.join(", ")}`);
    }

    const selected = [...usable]
      .sort((a, b) => score(b) - score(a) || a.fdcId.localeCompare(b.fdcId))
      .slice(0, TARGET);

    const final = new Map<string, FoodRow>();
    for (const id of curatedIds) {
      const food = byId.get(id);
      if (food) final.set(id, food);
    }
    for (const food of selected) final.set(food.fdcId, food);

    // Foods USDA does not carry (psyllium husk, kangaroo) are hand-curated
    // with their source recorded, so they sit beside the USDA rows.
    const supplements = loadSupplements();
    for (const supp of supplements) {
      if (final.has(supp.fdcId)) {
        console.warn(`  supplement ${supp.fdcId} collides with a USDA row`);
        continue;
      }
      final.set(supp.fdcId, supplementRow(supp));
    }

    const rows = [...final.values()].sort((a, b) => {
      if (a.commonName && !b.commonName) return -1;
      if (!a.commonName && b.commonName) return 1;
      return score(b) - score(a) || a.fdcId.localeCompare(b.fdcId);
    });

    // Build the full per-100 g panel for every food that made the catalog.
    const defs: Record<string, NutrientDef> = {};
    for (const food of rows) {
      if (!food.panel) {
        const panel = buildNutrientPanel(food.rawNutrients, nutrientMeta);
        food.panel = panel.values;
        for (const [key, def] of Object.entries(panel.defs)) defs[key] = def;
      }
      for (const key of Object.keys(food.panel)) {
        defs[key] ??= defaultNutrientDef(key);
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      source: "USDA FoodData Central (Foundation 2025-12-18 + SR Legacy 2018-04)",
      count: rows.length,
      foods: rows.map((food) => {
        const panel = food.panel ?? {};
        const aliases = [...(aliasesById.get(food.fdcId) ?? [])];
        for (const alias of food.aliases ?? []) {
          if (!aliases.includes(alias)) aliases.push(alias);
        }
        return {
          fdcId: food.fdcId,
          description: food.description,
          commonName: food.commonName ?? null,
          category: food.category || null,
          dataType: food.dataType,
          source: food.source ?? "usda",
          kcal: panel.kcal ?? null,
          proteinG: panel.protein_g ?? null,
          carbsG: panel.carbs_g ?? null,
          fatG: panel.fat_g ?? null,
          fiberG: panel.fiber_g ?? null,
          sugarG: panel.sugars_g ?? null,
          sodiumMg: panel.sodium_mg ?? null,
          nutrients: panel,
          searchText: normalise(
            [food.description, food.commonName, ...aliases]
              .filter(Boolean)
              .join(" "),
          ),
          portions: food.portions.slice(0, 8).map((p) => ({
            label: p.label,
            amount: p.amount,
            unit: p.unit,
            gramWeight: p.gramWeight,
          })),
        };
      }),
    };

    const defsPayload = {
      generatedAt: payload.generatedAt,
      source: payload.source,
      count: Object.keys(defs).length,
      nutrients: Object.fromEntries(
        Object.entries(defs).sort(([a], [b]) => a.localeCompare(b)),
      ),
    };

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload), "utf8");
    writeFileSync(DEFS_OUT, JSON.stringify(defsPayload, null, 2), "utf8");

    const withPortions = payload.foods.filter((f) => f.portions.length > 0).length;
    const curated = payload.foods.filter((f) => f.commonName).length;
    const supplementsUsed = payload.foods.filter((f) => f.source !== "usda").length;
    const values = payload.foods.reduce(
      (total, food) => total + Object.keys(food.nutrients).length,
      0,
    );
    console.log(
      `\nWrote ${payload.count} foods (${curated} curated, ${supplementsUsed} supplemental, ${withPortions} with household portions)`,
    );
    console.log(
      `  ${defsPayload.count} distinct nutrients, ${values} stored values (${(values / payload.count).toFixed(1)} per food)`,
    );
    console.log(`  -> ${OUT}\n  -> ${DEFS_OUT}`);
  })();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

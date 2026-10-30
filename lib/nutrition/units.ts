/**
 * Units, portion resolution and display formatting.
 *
 * Two rules keep this honest:
 *
 * 1. Weight converts to weight with exact factors. Volume converts to volume.
 * 2. Volume or a count becomes grams **only** through a USDA portion row that
 *    published a gram weight for that exact measure. We never invent a density,
 *    so "1 cup of lentils" and "1 cup of spinach" can never be treated as the
 *    same mass.
 */

export type UnitFamily = "weight" | "volume" | "count";

export type UnitId =
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "l"
  | "tsp"
  | "tbsp"
  | "cup"
  | "floz"
  | "piece"
  | "slice"
  | "clove"
  | "medium"
  | "small"
  | "large"
  | "serving"
  | "can"
  | "bunch"
  | "packet"
  | "fillet"
  | "stalk"
  | "ear"
  | "head"
  | "link";

interface UnitDef {
  id: UnitId;
  label: string;
  plural: string;
  family: UnitFamily;
  /** Grams per unit for weight, millilitres per unit for volume. */
  factor: number;
}

const DEFS: UnitDef[] = [
  { id: "g", label: "g", plural: "g", family: "weight", factor: 1 },
  { id: "kg", label: "kg", plural: "kg", family: "weight", factor: 1000 },
  { id: "oz", label: "oz", plural: "oz", family: "weight", factor: 28.349523125 },
  { id: "lb", label: "lb", plural: "lb", family: "weight", factor: 453.59237 },
  { id: "ml", label: "ml", plural: "ml", family: "volume", factor: 1 },
  { id: "l", label: "L", plural: "L", family: "volume", factor: 1000 },
  { id: "tsp", label: "tsp", plural: "tsp", family: "volume", factor: 4.92892159375 },
  {
    id: "tbsp",
    label: "tbsp",
    plural: "tbsp",
    family: "volume",
    factor: 14.78676478125,
  },
  { id: "cup", label: "cup", plural: "cups", family: "volume", factor: 236.5882365 },
  { id: "floz", label: "fl oz", plural: "fl oz", family: "volume", factor: 29.5735295625 },
  { id: "piece", label: "piece", plural: "pieces", family: "count", factor: 1 },
  { id: "slice", label: "slice", plural: "slices", family: "count", factor: 1 },
  { id: "clove", label: "clove", plural: "cloves", family: "count", factor: 1 },
  { id: "medium", label: "medium", plural: "medium", family: "count", factor: 1 },
  { id: "small", label: "small", plural: "small", family: "count", factor: 1 },
  { id: "large", label: "large", plural: "large", family: "count", factor: 1 },
  { id: "serving", label: "serving", plural: "servings", family: "count", factor: 1 },
  { id: "can", label: "can", plural: "cans", family: "count", factor: 1 },
  { id: "bunch", label: "bunch", plural: "bunches", family: "count", factor: 1 },
  { id: "packet", label: "packet", plural: "packets", family: "count", factor: 1 },
  { id: "fillet", label: "fillet", plural: "fillets", family: "count", factor: 1 },
  { id: "stalk", label: "stalk", plural: "stalks", family: "count", factor: 1 },
  { id: "ear", label: "ear", plural: "ears", family: "count", factor: 1 },
  { id: "head", label: "head", plural: "heads", family: "count", factor: 1 },
  { id: "link", label: "link", plural: "links", family: "count", factor: 1 },
];

export const UNITS: Record<UnitId, UnitDef> = Object.fromEntries(
  DEFS.map((d) => [d.id, d]),
) as Record<UnitId, UnitDef>;

export const WEIGHT_UNITS: UnitId[] = ["g", "oz", "lb", "kg"];
export const VOLUME_UNITS: UnitId[] = ["cup", "tbsp", "tsp", "ml", "l", "floz"];

export function isUnitId(value: string): value is UnitId {
  return Object.prototype.hasOwnProperty.call(UNITS, value);
}

export interface PortionLike {
  unit: string;
  amount: number;
  gramWeight: number;
  label: string;
}

/**
 * Map a USDA measure name or household description onto a canonical unit.
 * USDA uses `measure_unit_id = 9999` ("undetermined") and puts the real
 * measure in `portion_description`, so both sources are checked.
 */
export function parsePortionUnit(
  measureUnitName: string | null | undefined,
  portionDescription: string | null | undefined,
  modifier: string | null | undefined,
): UnitId | null {
  const candidates = [measureUnitName, portionDescription, modifier]
    .filter((v): v is string => !!v)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  for (const raw of candidates) {
    const direct = DIRECT_ALIASES[raw];
    if (direct) return direct;

    // "cup, sliced", "tbsp, heaping", "slice, thin"
    const first = raw.split(/[,;(]/)[0]?.trim();
    if (first && DIRECT_ALIASES[first]) return DIRECT_ALIASES[first];

    const leading = raw.match(/^([a-z]+)\b/)?.[1];
    if (leading && DIRECT_ALIASES[leading]) return DIRECT_ALIASES[leading];
  }
  return null;
}

const DIRECT_ALIASES: Record<string, UnitId> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  t: "tsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tb: "tbsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  c: "cup",
  cup: "cup",
  cups: "cup",
  "fl oz": "floz",
  "fluid ounce": "floz",
  "fluid ounces": "floz",
  piece: "piece",
  pieces: "piece",
  slice: "slice",
  slices: "slice",
  clove: "clove",
  cloves: "clove",
  medium: "medium",
  small: "small",
  large: "large",
  serving: "serving",
  servings: "serving",
  portion: "serving",
  can: "can",
  cans: "can",
  bunch: "bunch",
  bunches: "bunch",
  packet: "packet",
  packets: "packet",
  fillet: "fillet",
  fillets: "fillet",
  stalk: "stalk",
  stalks: "stalk",
  ear: "ear",
  ears: "ear",
  head: "head",
  heads: "head",
  link: "link",
  links: "link",
};

/** Grams for one unit of this ingredient, or null when no portion supports it. */
export function gramsPerUnit(
  unit: UnitId,
  portions: PortionLike[],
): number | null {
  const def = UNITS[unit];
  if (def.family === "weight") return def.factor;

  const matches = portions.filter((p) => p.unit === unit && p.amount > 0);
  if (matches.length === 0) return null;

  // Prefer the plain "1 cup" row over "1 cup, sliced" when both exist.
  const exact = matches.find((p) => p.amount === 1) ?? matches[0];
  return exact.gramWeight / exact.amount;
}

export function resolveGrams(
  amount: number,
  unit: UnitId,
  portions: PortionLike[],
): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const per = gramsPerUnit(unit, portions);
  if (per == null) return null;
  return Math.round(amount * per * 100) / 100;
}

/** Units the cook may pick for this food. Weight is always available. */
export function availableUnits(portions: PortionLike[]): UnitId[] {
  const present = new Set<UnitId>();
  for (const p of portions) {
    if (p.amount > 0 && p.gramWeight > 0 && isUnitId(p.unit)) {
      present.add(p.unit);
    }
  }
  const ordered: UnitId[] = [
    ...WEIGHT_UNITS.filter((u) => u === "g" || u === "oz"),
    ...VOLUME_UNITS.filter((u) => present.has(u)),
    ...[...present].filter(
      (u) =>
        UNITS[u].family === "count" && !VOLUME_UNITS.includes(u),
    ),
    ...(["kg", "lb"] as UnitId[]),
  ];
  return [...new Set(ordered)];
}

export function unitLabel(amount: number, unit: UnitId): string {
  const def = UNITS[unit];
  if (def.family === "weight" || def.family === "volume") {
    return `${trimNumber(amount)} ${def.label}`;
  }
  return `${trimNumber(amount)} ${amount === 1 ? def.label : def.plural}`;
}

export function trimNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`.replace(/0+$/, "");
}

/* -------------------------------------------------------------------------- */
/*  Display                                                                   */
/* -------------------------------------------------------------------------- */

export type UnitSystem = "metric" | "imperial";

/**
 * Format an ingredient for display without changing the underlying quantity.
 * The family of the *entered* unit wins: a cup stays a cup, 100 g becomes 3.5 oz.
 * Counts ("2 cloves") are unit-system neutral.
 */
export function formatQuantity(
  amount: number,
  unit: UnitId,
  system: UnitSystem,
  /** USDA's measured weight of one cup of this food, when it publishes one. */
  cupGrams?: number | null,
): string {
  const def = UNITS[unit];

  if (def.family === "count") return unitLabel(amount, unit);

  if (system === "metric") {
    if (def.family === "weight") {
      const grams = amount * def.factor;
      return grams >= 1000
        ? `${trimNumber(grams / 1000)} kg`
        : `${trimNumber(grams)} g`;
    }
    const ml = amount * def.factor;
    return ml >= 1000 ? `${trimNumber(ml / 1000)} L` : `${trimNumber(ml)} ml`;
  }

  if (def.family === "weight") {
    const grams = amount * def.factor;
    // US cooks read solids in cups, so prefer the measured cup weight when the
    // food has one. Falling back to ounces keeps the toggle honest for foods
    // USDA has no cup measure for.
    if (cupGrams && cupGrams > 0) {
      const cups = grams / cupGrams;
      if (cups >= 0.25) return `${trimNumber(cups)} cups`;
      return `${trimNumber(grams / 28.349523125)} oz`;
    }
    if (grams >= 453.59237) return `${trimNumber(grams / 453.59237)} lb`;
    return `${trimNumber(grams / 28.349523125)} oz`;
  }

  const ml = amount * def.factor;
  if (ml >= 236.5882365) return `${trimNumber(ml / 236.5882365)} cups`;
  if (ml >= 14.78676478125) return `${trimNumber(ml / 14.78676478125)} tbsp`;
  return `${trimNumber(ml / 4.92892159375)} tsp`;
}

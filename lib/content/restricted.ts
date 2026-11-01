/**
 * Kitchen content rules: no pork, no alcohol.
 *
 * Submissions are matched against the food names the cook picked and the prose
 * they wrote. This is deliberately conservative — a recipe that mentions pork
 * or a drink is blocked until the cook changes it — but it understands the
 * common ways a recipe says "none of that": turkey bacon, vegan chorizo,
 * alcohol-free beer, red wine vinegar, "no pork", "pork-free".
 */

export type RestrictedCategory = "pork" | "alcohol";

export type RestrictedField =
  | "title"
  | "summary"
  | "tips"
  | "ingredient"
  | "step";

export interface RestrictedHit {
  category: RestrictedCategory;
  /** The matched phrase, lower-cased. */
  term: string;
  field: RestrictedField;
  /** 1-based row number for ingredients and steps, null for prose. */
  index: number | null;
}

export interface RestrictedText {
  title: string;
  summary?: string | null;
  tips?: string | null;
  ingredients: { text: string; note?: string | null }[];
  steps: string[];
}

const PORK_TERMS = [
  "pork",
  "pig",
  "piglet",
  "suckling pig",
  "boar",
  "hog",
  "swine",
  "bacon",
  "pancetta",
  "guanciale",
  "prosciutto",
  "porchetta",
  "jamon",
  "serrano ham",
  "ham",
  "ham hock",
  "lard",
  "lardo",
  "lardon",
  "fatback",
  "salt pork",
  "chorizo",
  "salami",
  "pepperoni",
  "mortadella",
  "coppa",
  "capicola",
  "capocollo",
  "soppressata",
  "nduja",
  "'nduja",
  "andouille",
  "kielbasa",
  "bratwurst",
  "carnitas",
  "al pastor",
  "char siu",
  "chicharron",
  "lechon",
  "tonkotsu",
  "tonkatsu",
  "kalua pig",
  "pork rind",
  "scratchings",
  "head cheese",
];

const ALCOHOL_TERMS = [
  "alcohol",
  "liquor",
  "booze",
  "wine",
  "red wine",
  "white wine",
  "rose wine",
  "rice wine",
  "cooking wine",
  "shaoxing wine",
  "shaoxing",
  "beer",
  "lager",
  "hard cider",
  "mead",
  "sake",
  "soju",
  "mirin",
  "sherry",
  "port",
  "madeira",
  "marsala",
  "vermouth",
  "brandy",
  "cognac",
  "armagnac",
  "calvados",
  "whisky",
  "whiskey",
  "bourbon",
  "scotch",
  "rum",
  "vodka",
  "gin",
  "tequila",
  "mezcal",
  "absinthe",
  "sambuca",
  "grappa",
  "ouzo",
  "raki",
  "pastis",
  "pernod",
  "pisco",
  "cachaca",
  "liqueur",
  "amaretto",
  "cointreau",
  "triple sec",
  "kahlua",
  "baileys",
  "limoncello",
  "schnapps",
  "aquavit",
  "akvavit",
  "prosecco",
  "champagne",
  "cava",
  "sangria",
];

const CATEGORY_TERMS: Record<RestrictedCategory, string[]> = {
  pork: PORK_TERMS,
  alcohol: ALCOHOL_TERMS,
};

const CATEGORY_LABEL: Record<RestrictedCategory, string> = {
  pork: "pork",
  alcohol: "alcohol",
};

/** A last-minute escape hatch, not a substitute for the rules. */
const NEGATION =
  /\b(?:no|without|free\s+from|free\s+of|skip\s+the|omit\s+the|instead\s+of)\b(?:\s+[a-z']+){0,2}\s*$/;

/** "Turkey bacon", "beef salami", "vegan chorizo" are not pork. */
const PORK_SWAP =
  /\b(?:turkey|beef|chicken|lamb|veal|duck|venison|vegan|vegetarian|plant\s*based|meat\s*free|meatless|soy|soya|tofu|tempeh|seitan|mushroom|coconut|jackfruit|eggplant|imitation|facon|faux)\b\s*$/;

/** USDA writes the meat first: "Bacon, turkey, unprepared", "Salami, cooked, beef". */
const PORK_SWAP_AFTER =
  /^[\s,]+(?:(?:cooked|smoked|sliced|diced|bits|pieces|raw|unprepared|prepared|cured|dried|restaurant)\s*,\s*)?(?:turkey|beef|chicken|lamb|veal|duck|venison|vegan|vegetarian|plant\s*based|meat\s*free|meatless|soy|soya|tofu|tempeh|seitan|mushroom|coconut|jackfruit|eggplant|imitation|facon|faux)\s*(?:,|$)/;

/** Cured products USDA names as "Bacon, turkey" rather than "Turkey bacon". */
const PORK_PRODUCTS = new Set([
  "bacon",
  "ham",
  "chorizo",
  "salami",
  "pepperoni",
  "mortadella",
  "coppa",
  "capicola",
  "capocollo",
  "soppressata",
  "andouille",
  "kielbasa",
  "bratwurst",
  "lardon",
]);

/** "Non-alcoholic beer", "zero alcohol wine", "0.0% lager". */
const ALCOHOL_FREE =
  /(?:\b(?:non|not)\s*alcoholic|\bnonalcoholic|\balcohol\s*free|\bzero\s*alcohol|\bdealcoholi[sz]ed|\bde\s*alcoholi[sz]ed|\bvirgin|\b0(?:[.,]0)?\s*%)\s*$/;

/** USDA writes the drink first: "Wine, non-alcoholic". */
const ALCOHOL_FREE_AFTER =
  /^[\s,]+(?:(?:non|not)\s*alcoholic|nonalcoholic|alcohol\s*free|zero\s*alcohol|de\s*alcoholi[sz]ed|0(?:[.,]0)?\s*%)\s*(?:,|$)/;

const HYPHENS = /[\u2010-\u2015-]/g;

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u0060\u00b4]/g, "'")
    .replace(HYPHENS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termPattern(terms: string[]): RegExp {
  const source = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`(?<![a-z])(?:${source})(?![a-z])`, "g");
}

const PATTERNS: Record<RestrictedCategory, RegExp> = {
  pork: termPattern(PORK_TERMS),
  alcohol: termPattern(ALCOHOL_TERMS),
};

function isExempt(
  category: RestrictedCategory,
  term: string,
  before: string,
  after: string,
): boolean {
  if (NEGATION.test(before)) return true;
  if (/^\s*free\b/.test(after)) return true;

  if (category === "pork") {
    if (PORK_SWAP.test(before)) return true;
    return PORK_PRODUCTS.has(term) && PORK_SWAP_AFTER.test(after);
  }

  if (ALCOHOL_FREE.test(before)) return true;
  if (ALCOHOL_FREE_AFTER.test(after)) return true;
  if (/^\s*vinegar\b/.test(after)) return true;
  if (/\bvinegar\b[^.]*$/.test(before)) return true;
  if (term === "alcohol" && /\bsugar\s*$/.test(before)) return true;
  if (term === "alcohol" && /^\s*(?:extraction|extracted)\b/.test(after)) {
    return true;
  }
  if (term === "beer" && /\b(?:root|ginger)\s*$/.test(before)) return true;
  if (term === "madeira" && /^\s*cake\b/.test(after)) return true;
  if (term === "port" && /^\s*(?:de\s+)?salut\b/.test(after)) return true;
  if (term === "sake" && /^\s*of\b/.test(after) && /\bthe\s*$/.test(before)) {
    return true;
  }
  return false;
}

function scanText(
  value: string,
  field: RestrictedField,
  index: number | null,
  hits: RestrictedHit[],
): void {
  if (!value.trim()) return;
  const text = normalise(value);

  for (const category of ["pork", "alcohol"] as const) {
    const pattern = PATTERNS[category];
    pattern.lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const term = match[0];
      const start = match.index ?? 0;
      const before = text.slice(Math.max(0, start - 40), start);
      const after = text.slice(start + term.length, start + term.length + 16);
      if (isExempt(category, term, before, after)) continue;

      const duplicate = hits.some(
        (hit) =>
          hit.field === field &&
          hit.index === index &&
          hit.term === term &&
          hit.category === category,
      );
      if (!duplicate) hits.push({ category, term, field, index });
    }
  }
}

/** Every pork and alcohol mention in a recipe, with where it was found. */
export function findRestrictedContent(recipe: RestrictedText): RestrictedHit[] {
  const hits: RestrictedHit[] = [];

  scanText(recipe.title, "title", null, hits);
  scanText(recipe.summary ?? "", "summary", null, hits);
  scanText(recipe.tips ?? "", "tips", null, hits);
  recipe.ingredients.forEach((ingredient, row) => {
    scanText(
      [ingredient.text, ingredient.note].filter(Boolean).join(" "),
      "ingredient",
      row + 1,
      hits,
    );
  });
  recipe.steps.forEach((step, row) => {
    scanText(step, "step", row + 1, hits);
  });

  return hits;
}

function location(hit: RestrictedHit): string {
  switch (hit.field) {
    case "ingredient":
      return `ingredient ${hit.index}`;
    case "step":
      return `step ${hit.index}`;
    case "title":
      return "the title";
    case "summary":
      return "the summary";
    case "tips":
      return "the cook's note";
  }
}

export function describeHit(hit: RestrictedHit): string {
  return `“${hit.term}” in ${location(hit)}`;
}

/** One publish-gate line per restricted category. */
export function restrictedProblems(hits: RestrictedHit[]): string[] {
  const problems: string[] = [];

  for (const category of ["pork", "alcohol"] as const) {
    const rows = hits.filter((hit) => hit.category === category);
    if (!rows.length) continue;

    const shown = rows.slice(0, 3).map(describeHit);
    const extra = rows.length - shown.length;
    problems.push(
      `Contains ${CATEGORY_LABEL[category]}: ${shown.join(", ")}${
        extra > 0 ? ` and ${extra} more` : ""
      }`,
    );
  }

  return problems;
}

/** The sentence a cook sees when a submission is refused. */
export function restrictedSubmissionMessage(hits: RestrictedHit[]): string {
  const problems = restrictedProblems(hits);
  return `This kitchen doesn't publish recipes with pork or alcohol. ${problems.join(
    ". ",
  )}. Remove or replace them and submit again.`;
}

/**
 * Seed the food catalog and the editorial recipes.
 *
 *   npm run seed
 *
 * Idempotent: foods are upserted by fdc_id, recipes are replaced by slug.
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { eq, inArray, isNull, sql } from "drizzle-orm";

import { computeNutrition, deriveNutritionTags } from "../lib/nutrition/compute";
import { resolveGrams, unitLabel, type UnitId } from "../lib/nutrition/units";
import { countryName } from "../lib/countries";
import { LICENSE_VERSION, TERMS_VERSION } from "../lib/site";
import { SEED_RECIPES } from "../seed/recipes";

const SEED_PATH = resolve(import.meta.dirname, "..", "seed", "foods.json");

/**
 * Cloudflare D1 rejects any statement with more than 100 bound parameters
 * (SQLITE_ERROR: too many SQL variables). Local SQLite allows far more, so
 * batches must be sized for D1 or the seed only fails against production.
 */
const D1_MAX_PARAMS = 100;

function batch<T>(rows: T[], paramsPerRow: number): T[][] {
  const size = Math.max(1, Math.floor(D1_MAX_PARAMS / paramsPerRow));
  return chunkRows(rows, size);
}

/** Fixed row count, for rows whose bound JSON can get large. */
function chunkRows<T>(rows: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    batches.push(rows.slice(i, i + size));
  }
  return batches;
}

interface SeedFood {
  fdcId: string;
  description: string;
  commonName: string | null;
  category: string | null;
  dataType: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  source?: string;
  /** Canonical nutrient key -> per-100 g amount (lib/nutrition/nutrients.ts). */
  nutrients?: Record<string, number>;
  searchText: string;
  portions: {
    label: string;
    amount: number;
    unit: UnitId;
    gramWeight: number;
  }[];
}

async function main() {
  const { db } = await import("../lib/db");
  const schema = await import("../lib/db/schema");
  const { foods, foodPortions, foodNutrients, recipes } = schema;

  const payload = JSON.parse(readFileSync(SEED_PATH, "utf8")) as {
    count: number;
    foods: SeedFood[];
  };
  console.log(`Seeding ${payload.foods.length} USDA foods…`);

  // foods binds 16 parameters per row (created_at is a SQL default expression).
  const chunks = batch(payload.foods, 16);

  for (const [index, chunk] of chunks.entries()) {
    if (index % 40 === 0) {
      console.log(
        `  ${Math.min(index * chunk.length, payload.foods.length)}/${payload.foods.length} foods…`,
      );
    }
    await db
      .insert(foods)
      .values(
        chunk.map((f) => ({
          fdcId: f.fdcId,
          description: f.description,
          commonName: f.commonName,
          category: f.category,
          dataType: f.dataType,
          kcal: f.kcal,
          proteinG: f.proteinG,
          carbsG: f.carbsG,
          fatG: f.fatG,
          fiberG: f.fiberG,
          sugarG: f.sugarG,
          sodiumMg: f.sodiumMg,
          source: f.source ?? "usda",
          searchText: f.searchText,
        })),
      )
      .onConflictDoUpdate({
        target: foods.fdcId,
        set: {
          description: sql`excluded.description`,
          commonName: sql`excluded.common_name`,
          category: sql`excluded.category`,
          dataType: sql`excluded.data_type`,
          kcal: sql`excluded.kcal`,
          proteinG: sql`excluded.protein_g`,
          carbsG: sql`excluded.carbs_g`,
          fatG: sql`excluded.fat_g`,
          fiberG: sql`excluded.fiber_g`,
          sugarG: sql`excluded.sugar_g`,
          sodiumMg: sql`excluded.sodium_mg`,
          source: sql`excluded.source`,
          searchText: sql`excluded.search_text`,
        },
      });

    // One panel row per food: ~150 numbers in a single JSON column, so the
    // insert stays well under D1's 100-bound-parameter limit.
    const panels = chunk.map((f) => ({
      fdcId: f.fdcId,
      nutrients: JSON.stringify(f.nutrients ?? {}),
      source: f.source ?? "usda",
    }));
    // Ten panels per statement: ~150 numbers each keeps a batch well under
    // D1's per-statement size limit while still fitting the parameter cap.
    for (const slice of chunkRows(panels, 10)) {
      await db
        .insert(foodNutrients)
        .values(slice)
        .onConflictDoUpdate({
          target: foodNutrients.fdcId,
          set: {
            nutrients: sql`excluded.nutrients`,
            source: sql`excluded.source`,
            updatedAt: sql`(unixepoch() * 1000)`,
          },
        });
    }

    const ids = chunk.map((f) => f.fdcId);
    await db.delete(foodPortions).where(inArray(foodPortions.fdcId, ids));
    const portions = chunk.flatMap((f) =>
      f.portions.map((p) => ({
        fdcId: f.fdcId,
        label: p.label,
        amount: p.amount,
        unit: p.unit,
        gramWeight: p.gramWeight,
      })),
    );
    // food_portions binds 5 parameters per row (id is auto-incremented).
    for (const slice of batch(portions, 5)) {
      await db.insert(foodPortions).values(slice);
    }
  }

  // Rows that predate the panel table (or came from an older live lookup)
  // would otherwise be the only foods without nutrients. Give them the seven
  // macro values the catalog already stores; the next reseed replaces this
  // with the full panel if the food is still selected.
  const missingPanels = await db
    .select({
      fdcId: foods.fdcId,
      kcal: foods.kcal,
      proteinG: foods.proteinG,
      carbsG: foods.carbsG,
      fatG: foods.fatG,
      fiberG: foods.fiberG,
      sugarG: foods.sugarG,
      sodiumMg: foods.sodiumMg,
    })
    .from(foods)
    .leftJoin(foodNutrients, eq(foodNutrients.fdcId, foods.fdcId))
    .where(isNull(foodNutrients.fdcId));

  if (missingPanels.length) {
    const backfill = missingPanels.map((row) => {
      const panel: Record<string, number> = {};
      const values = {
        kcal: row.kcal,
        protein_g: row.proteinG,
        carbs_g: row.carbsG,
        fat_g: row.fatG,
        fiber_g: row.fiberG,
        sugars_g: row.sugarG,
        sodium_mg: row.sodiumMg,
      };
      for (const [key, value] of Object.entries(values)) {
        if (value != null) panel[key] = value;
      }
      return {
        fdcId: row.fdcId,
        nutrients: JSON.stringify(panel),
        source: "macro-backfill",
      };
    });
    for (const slice of chunkRows(backfill, 10)) {
      await db.insert(foodNutrients).values(slice);
    }
    console.log(`  backfilled ${backfill.length} legacy food(s) from macro columns`);
  }

  const allFoods = await db.select().from(foods);
  const allPortions = await db.select().from(foodPortions);
  console.log(`  catalog ready: ${allFoods.length} foods, ${allPortions.length} portions`);

  const portionsByFood = new Map<string, typeof allPortions>();
  for (const portion of allPortions) {
    const list = portionsByFood.get(portion.fdcId) ?? [];
    list.push(portion);
    portionsByFood.set(portion.fdcId, list);
  }

  const byCommon = new Map<string, (typeof allFoods)[number]>();
  const byDescription = new Map<string, (typeof allFoods)[number]>();
  for (const food of allFoods) {
    if (food.commonName) byCommon.set(food.commonName.toLowerCase(), food);
    byDescription.set(food.description.toLowerCase(), food);
  }

  function findFood(name: string) {
    return (
      byCommon.get(name.toLowerCase()) ??
      byDescription.get(name.toLowerCase()) ??
      null
    );
  }

  console.log(`\nSeeding ${SEED_RECIPES.length} recipes…`);
  const summary: {
    title: string;
    fiber: number;
    protein: number;
    tags: string[];
  }[] = [];

  for (const [index, seed] of SEED_RECIPES.entries()) {
    const rows = seed.ingredients.map((ingredient, position) => {
      const food = findFood(ingredient.food);
      if (!food) {
        throw new Error(
          `Recipe "${seed.slug}" ingredient "${ingredient.food}" is not in the catalog`,
        );
      }
      const portions = portionsByFood.get(food.fdcId) ?? [];
      const grams = resolveGrams(ingredient.amount, ingredient.unit, portions);
      if (grams == null) {
        throw new Error(
          `Recipe "${seed.slug}": no portion for ${ingredient.amount} ${ingredient.unit} of "${food.description}"`,
        );
      }
      return { ingredient, position, food, grams };
    });

    const nutrition = computeNutrition(
      rows.map((row) => ({
        grams: row.grams,
        food: row.food,
        mappingStatus: "mapped" as const,
      })),
      seed.servings,
    );

    if (nutrition.confidence !== "computed") {
      throw new Error(`Recipe "${seed.slug}" has incomplete nutrition`);
    }

    const tags = [
      ...new Set([...deriveNutritionTags(nutrition.perServing), ...seed.dietTags]),
    ];

    await db.delete(recipes).where(sql`${recipes.slug} = ${seed.slug}`);

    const [created] = await db
      .insert(recipes)
      .values({
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        status: "approved",
        authorName: seed.authorName,
        authorCountryCode: seed.countryCode,
        authorCountryName: countryName(seed.countryCode),
        servings: seed.servings,
        servingNote: seed.servingNote,
        servingGrams: seed.servingGrams,
        prepMinutes: seed.prepMinutes,
        cookMinutes: seed.cookMinutes,
        tips: seed.tips,
        termsVersion: TERMS_VERSION,
        publishedAt: new Date(),
        reviewedAt: new Date(),
        featuredAt: index === 0 ? new Date() : null,
        submitterToken: `seed-${seed.slug}-${index}`,
        imageRightsAttestedAt: null,
        imageUrl: null,
      })
      .returning({ id: recipes.id });

    // recipe_ingredients binds 10 parameters per row, including the generated id.
    const ingredientRows = rows.map((row) => ({
      recipeId: created.id,
      position: row.position,
      rawText: `${unitLabel(row.ingredient.amount, row.ingredient.unit)} ${row.food.commonName ?? row.food.description}`,
      amount: row.ingredient.amount,
      unit: row.ingredient.unit,
      foodFdcId: row.food.fdcId,
      grams: row.grams,
      note: row.ingredient.note ?? null,
      mappingStatus: "mapped" as const,
    }));
    for (const slice of batch(ingredientRows, 10)) {
      await db.insert(schema.recipeIngredients).values(slice);
    }

    const stepRows = seed.steps.map((text, position) => ({
      recipeId: created.id,
      position,
      text,
    }));
    for (const slice of batch(stepRows, 4)) {
      await db.insert(schema.recipeSteps).values(slice);
    }

    const tagRows = tags.map((tag) => ({ recipeId: created.id, tag }));
    for (const slice of batch(tagRows, 2)) {
      await db.insert(schema.recipeTags).values(slice);
    }

    await db.insert(schema.recipeNutrition).values({
      recipeId: created.id,
      ...nutrition.perServing,
      confidence: "computed",
    });

    summary.push({
      title: seed.title,
      fiber: nutrition.perServing.fiberG,
      protein: nutrition.perServing.proteinG,
      tags,
    });
  }

  console.table(
    summary.map((row) => ({
      recipe: row.title,
      fibre: `${row.fiber.toFixed(1)} g`,
      protein: `${row.protein.toFixed(1)} g`,
      tags: row.tags.join(", "),
    })),
  );

  console.log(
    `\nDone. License version ${LICENSE_VERSION}; terms ${TERMS_VERSION}.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  foods,
  recipeIngredients,
  recipeNutrition,
  recipeSteps,
  recipeTags,
  recipes,
} from "@/lib/db/schema";
import { PAGE_SIZE } from "@/lib/site";

export interface RecipeListItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  authorName: string;
  authorCountryName: string;
  authorCountryCode: string;
  authorHandle: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  publishedAt: Date | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  tags: string[];
}

export interface BrowseFilters {
  tag?: string;
  diet?: string;
  country?: string;
  q?: string;
  sort?: "newest" | "fiber" | "protein";
  page?: number;
}

const listSelection = {
  id: recipes.id,
  slug: recipes.slug,
  title: recipes.title,
  summary: recipes.summary,
  imageUrl: recipes.imageUrl,
  imageAlt: recipes.imageAlt,
  authorName: recipes.authorName,
  authorCountryName: recipes.authorCountryName,
  authorCountryCode: recipes.authorCountryCode,
  authorHandle: recipes.authorHandle,
  servings: recipes.servings,
  prepMinutes: recipes.prepMinutes,
  cookMinutes: recipes.cookMinutes,
  publishedAt: recipes.publishedAt,
  kcal: recipeNutrition.kcal,
  proteinG: recipeNutrition.proteinG,
  carbsG: recipeNutrition.carbsG,
  fatG: recipeNutrition.fatG,
  fiberG: recipeNutrition.fiberG,
};

/**
 * Tags used to be aggregated with Postgres' array_agg inside the list query.
 * SQLite has no array type, so they are attached in one extra query instead of
 * paying for a join per row.
 */
async function withTags<T extends { id: string }>(
  rows: T[],
): Promise<(T & { tags: string[] })[]> {
  if (!rows.length) return rows.map((row) => ({ ...row, tags: [] }));

  const tagRows = await db
    .select({ recipeId: recipeTags.recipeId, tag: recipeTags.tag })
    .from(recipeTags)
    .where(
      inArray(
        recipeTags.recipeId,
        rows.map((row) => row.id),
      ),
    );

  const byRecipe = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = byRecipe.get(row.recipeId) ?? [];
    list.push(row.tag);
    byRecipe.set(row.recipeId, list);
  }

  return rows.map((row) => ({
    ...row,
    tags: (byRecipe.get(row.id) ?? []).sort(),
  }));
}

function tagFilter(tag: string) {
  return sql`exists (
    select 1 from recipe_tags rt
    where rt.recipe_id = ${recipes.id} and rt.tag = ${tag}
  )`;
}

function buildWhere(filters: BrowseFilters) {
  const conditions = [eq(recipes.status, "approved")];

  if (filters.tag) conditions.push(tagFilter(filters.tag));
  if (filters.diet) conditions.push(tagFilter(filters.diet));
  if (filters.country) {
    conditions.push(eq(recipes.authorCountryCode, filters.country));
  }
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "").toLowerCase()}%`;
    conditions.push(
      sql`(lower(${recipes.title}) like ${term} or lower(coalesce(${recipes.summary}, '')) like ${term})`,
    );
  }

  return and(...conditions);
}

export async function browseRecipes(filters: BrowseFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const order = (() => {
    switch (filters.sort) {
      case "fiber":
        return [desc(recipeNutrition.fiberG), desc(recipes.publishedAt)];
      case "protein":
        return [desc(recipeNutrition.proteinG), desc(recipes.publishedAt)];
      default:
        return [desc(recipes.publishedAt), desc(recipes.id)];
    }
  })();

  const [rows, totals] = await Promise.all([
    db
      .select(listSelection)
      .from(recipes)
      .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(recipes)
      .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
      .where(where),
  ]);

  const total = totals[0]?.count ?? 0;

  return {
    recipes: (await withTags(rows)) as RecipeListItem[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    hasMore: page * PAGE_SIZE < total,
  };
}

export async function latestRecipes(limit = 6) {
  const rows = await db
    .select(listSelection)
    .from(recipes)
    .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
    .where(eq(recipes.status, "approved"))
    .orderBy(desc(recipes.publishedAt))
    .limit(limit);
  return (await withTags(rows)) as RecipeListItem[];
}

export async function featuredRecipe() {
  const rows = await db
    .select(listSelection)
    .from(recipes)
    .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
    .where(
      and(eq(recipes.status, "approved"), sql`${recipes.featuredAt} is not null`),
    )
    .orderBy(desc(recipes.featuredAt))
    .limit(1);
  if (rows[0]) {
    const [withTagList] = await withTags(rows);
    return withTagList as RecipeListItem;
  }
  const fallback = await latestRecipes(1);
  return fallback[0] ?? null;
}

export async function recipeStats() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      highFiber: sql<number>`count(*) filter (where ${recipeNutrition.fiberG} >= 8)`,
      highProtein: sql<number>`count(*) filter (where ${recipeNutrition.proteinG} >= 25)`,
      both: sql<number>`count(*) filter (where ${recipeNutrition.fiberG} >= 8 and ${recipeNutrition.proteinG} >= 25)`,
    })
    .from(recipes)
    .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
    .where(eq(recipes.status, "approved"));
  return row ?? { total: 0, highFiber: 0, highProtein: 0, both: 0 };
}

export async function recipeCountries() {
  const rows = await db
    .select({
      code: recipes.authorCountryCode,
      name: recipes.authorCountryName,
      count: sql<number>`count(*)`,
    })
    .from(recipes)
    .where(eq(recipes.status, "approved"))
    .groupBy(recipes.authorCountryCode, recipes.authorCountryName)
    .orderBy(desc(sql`count(*)`));
  return rows;
}

export interface FullIngredient {
  id: string;
  position: number;
  rawText: string;
  amount: number;
  unit: string;
  note: string | null;
  grams: number | null;
  mappingStatus: string;
  foodName: string | null;
  foodDescription: string | null;
  /** Grams in one measured cup of this food, when USDA publishes it. */
  cupGrams: number | null;
}

export type FullRecipe = Awaited<ReturnType<typeof getRecipeBySlug>>;

export async function getRecipeBySlug(slug: string) {
  const [recipe] = await db
    .select({
      ...listSelection,
      tips: recipes.tips,
      servingNote: recipes.servingNote,
      servingGrams: recipes.servingGrams,
      status: recipes.status,
      submittedAt: recipes.submittedAt,
      termsVersion: recipes.termsVersion,
    })
    .from(recipes)
    .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
    .where(and(eq(recipes.slug, slug), eq(recipes.status, "approved")))
    .limit(1);

  if (!recipe) return null;

  const [ingredients, steps] = await Promise.all([
    db
      .select({
        id: recipeIngredients.id,
        position: recipeIngredients.position,
        rawText: recipeIngredients.rawText,
        amount: recipeIngredients.amount,
        unit: recipeIngredients.unit,
        note: recipeIngredients.note,
        grams: recipeIngredients.grams,
        mappingStatus: recipeIngredients.mappingStatus,
        foodName: foods.commonName,
        foodDescription: foods.description,
        cupGrams: sql<number | null>`(
          select p.gram_weight from food_portions p
          where p.fdc_id = ${recipeIngredients.foodFdcId}
            and p.unit = 'cup'
          order by p.amount asc, p.id asc
          limit 1
        )`,
      })
      .from(recipeIngredients)
      .leftJoin(foods, eq(foods.fdcId, recipeIngredients.foodFdcId))
      .where(eq(recipeIngredients.recipeId, recipe.id))
      .orderBy(recipeIngredients.position),
    db
      .select({ text: recipeSteps.text })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, recipe.id))
      .orderBy(recipeSteps.position),
  ]);

  const [withTagList] = await withTags([recipe]);

  return {
    ...withTagList,
    ingredients: ingredients as FullIngredient[],
    steps: steps.map((s) => s.text),
  };
}

export async function relatedRecipes(slug: string, tags: string[], limit = 3) {
  const preferred = tags.filter((tag) =>
    ["high_fiber", "high_protein", "vegan", "vegetarian", "gluten_free"].includes(
      tag,
    ),
  );
  const tagSql = sql.join(
    preferred.map((tag) => sql`${tag}`),
    sql`, `,
  );
  const where = preferred.length
    ? and(
        eq(recipes.status, "approved"),
        ne(recipes.slug, slug),
        sql`exists (
          select 1 from recipe_tags rt
          where rt.recipe_id = ${recipes.id}
            and rt.tag in (${tagSql})
        )`,
      )
    : and(eq(recipes.status, "approved"), ne(recipes.slug, slug));

  const rows = await db
    .select(listSelection)
    .from(recipes)
    .innerJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
    .where(where)
    .orderBy(desc(recipes.publishedAt))
    .limit(limit);

  return (await withTags(rows)) as RecipeListItem[];
}

export async function recipeSlugs() {
  return db
    .select({ slug: recipes.slug, publishedAt: recipes.publishedAt })
    .from(recipes)
    .where(eq(recipes.status, "approved"))
    .orderBy(desc(recipes.publishedAt));
}

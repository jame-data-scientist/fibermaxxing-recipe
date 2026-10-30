import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  foods,
  recipeIngredients,
  recipeNutrition,
  recipeSteps,
  recipeTags,
  recipes,
} from "@/lib/db/schema";
import { computeNutrition, deriveNutritionTags } from "@/lib/nutrition/compute";

export const DERIVED_TAGS = ["high_fiber", "high_protein", "both"];

/** Recomputes a recipe's per-serving nutrition from its mapped ingredients. */
export async function recomputeRecipe(recipeId: string) {
  const [recipe] = await db
    .select({ servings: recipes.servings })
    .from(recipes)
    .where(eq(recipes.id, recipeId));

  if (!recipe) throw new Error("Recipe not found");

  const rows = await db
    .select({
      grams: recipeIngredients.grams,
      mappingStatus: recipeIngredients.mappingStatus,
      kcal: foods.kcal,
      proteinG: foods.proteinG,
      carbsG: foods.carbsG,
      fatG: foods.fatG,
      fiberG: foods.fiberG,
      sugarG: foods.sugarG,
      sodiumMg: foods.sodiumMg,
    })
    .from(recipeIngredients)
    .leftJoin(foods, eq(foods.fdcId, recipeIngredients.foodFdcId))
    .where(eq(recipeIngredients.recipeId, recipeId));

  const result = computeNutrition(
    rows.map((row) => ({
      grams: row.grams,
      mappingStatus: row.mappingStatus,
      food:
        row.mappingStatus === "negligible"
          ? null
          : {
              kcal: row.kcal,
              proteinG: row.proteinG,
              carbsG: row.carbsG,
              fatG: row.fatG,
              fiberG: row.fiberG,
              sugarG: row.sugarG,
              sodiumMg: row.sodiumMg,
            },
    })),
    recipe.servings,
  );

  await db
    .insert(recipeNutrition)
    .values({
      recipeId,
      ...result.perServing,
      confidence: result.confidence,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: recipeNutrition.recipeId,
      set: {
        ...result.perServing,
        confidence: result.confidence,
        computedAt: new Date(),
      },
    });

  await db
    .delete(recipeTags)
    .where(
      and(eq(recipeTags.recipeId, recipeId), inArray(recipeTags.tag, DERIVED_TAGS)),
    );

  const tags = deriveNutritionTags(result.perServing);
  if (tags.length) {
    await db
      .insert(recipeTags)
      .values(tags.map((tag) => ({ recipeId, tag })))
      .onConflictDoNothing();
  }

  return result;
}

export interface PublishGate {
  ok: boolean;
  problems: string[];
}

export async function publishGate(recipeId: string): Promise<PublishGate> {
  const [recipe] = await db
    .select({
      imageUrl: recipes.imageUrl,
      imageRightsAttestedAt: recipes.imageRightsAttestedAt,
    })
    .from(recipes)
    .where(eq(recipes.id, recipeId));

  const ingredients = await db
    .select({ mappingStatus: recipeIngredients.mappingStatus })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));

  const [steps] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recipeSteps)
    .where(eq(recipeSteps.recipeId, recipeId));

  const [nutrition] = await db
    .select({ confidence: recipeNutrition.confidence })
    .from(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, recipeId));

  const problems: string[] = [];
  if (!recipe) return { ok: false, problems: ["Recipe not found"] };
  if (ingredients.length < 2) problems.push("At least two ingredients");
  const unmapped = ingredients.filter((row) => row.mappingStatus === "unmapped");
  if (unmapped.length) {
    problems.push(
      `${unmapped.length} ingredient${unmapped.length === 1 ? "" : "s"} still unmapped`,
    );
  }
  if (!steps?.count) problems.push("At least one instruction step");
  if (!nutrition || nutrition.confidence !== "computed") {
    problems.push("Nutrition could not be computed");
  }
  if (recipe.imageUrl && !recipe.imageRightsAttestedAt) {
    problems.push("Photo needs an originality attestation");
  }

  return { ok: problems.length === 0, problems };
}

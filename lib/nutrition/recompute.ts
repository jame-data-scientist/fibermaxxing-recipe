import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  foods,
  recipeIngredients,
  recipeNutrition,
  recipeSteps,
  recipeTags,
  recipes,
} from "@/lib/db/schema";
import {
  findRestrictedContent,
  restrictedProblems,
} from "@/lib/content/restricted";
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

/**
 * Pork and alcohol problems only. Kept separate from the rest of the publish
 * gate so a live recipe can be re-checked after an edit without paying for the
 * nutrition and photo checks.
 */
export async function recipePolicyProblems(
  recipeId: string,
): Promise<string[]> {
  const [recipe] = await db
    .select({
      title: recipes.title,
      summary: recipes.summary,
      tips: recipes.tips,
    })
    .from(recipes)
    .where(eq(recipes.id, recipeId));
  if (!recipe) return [];

  const [ingredients, steps] = await Promise.all([
    db
      .select({
        rawText: recipeIngredients.rawText,
        note: recipeIngredients.note,
        foodName: foods.commonName,
        foodDescription: foods.description,
      })
      .from(recipeIngredients)
      .leftJoin(foods, eq(foods.fdcId, recipeIngredients.foodFdcId))
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(recipeIngredients.position),
    db
      .select({ text: recipeSteps.text })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, recipeId))
      .orderBy(recipeSteps.position),
  ]);

  return restrictedProblems(
    findRestrictedContent({
      title: recipe.title,
      summary: recipe.summary,
      tips: recipe.tips,
      ingredients: ingredients.map((row) => ({
        text: [row.rawText, row.foodName, row.foodDescription]
          .filter(Boolean)
          .join(" "),
        note: row.note,
      })),
      steps: steps.map((row) => row.text),
    }),
  );
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

  const steps = await db
    .select({ text: recipeSteps.text })
    .from(recipeSteps)
    .where(eq(recipeSteps.recipeId, recipeId))
    .orderBy(recipeSteps.position);

  const [nutrition] = await db
    .select({ confidence: recipeNutrition.confidence })
    .from(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, recipeId));

  if (!recipe) return { ok: false, problems: ["Recipe not found"] };

  const problems: string[] = await recipePolicyProblems(recipeId);

  if (ingredients.length < 2) problems.push("At least two ingredients");
  const unmapped = ingredients.filter((row) => row.mappingStatus === "unmapped");
  if (unmapped.length) {
    problems.push(
      `${unmapped.length} ingredient${unmapped.length === 1 ? "" : "s"} still unmapped`,
    );
  }
  if (!steps.length) problems.push("At least one instruction step");
  if (!nutrition || nutrition.confidence !== "computed") {
    problems.push("Nutrition could not be computed");
  }
  if (recipe.imageUrl && !recipe.imageRightsAttestedAt) {
    problems.push("Photo needs an originality attestation");
  }

  return { ok: problems.length === 0, problems };
}

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  dmcaNotices,
  foods,
  infringementStrikes,
  recipeIngredients,
  recipeNutrition,
  recipeReports,
  recipeSteps,
  recipeTags,
  recipes,
} from "@/lib/db/schema";
import { publishGate } from "@/lib/nutrition/recompute";

export async function adminCounts() {
  const [recipeRow] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${recipes.status} = 'pending')`,
      approved: sql<number>`count(*) filter (where ${recipes.status} = 'approved')`,
      rejected: sql<number>`count(*) filter (where ${recipes.status} = 'rejected')`,
    })
    .from(recipes);

  const [reportRow] = await db
    .select({ open: sql<number>`count(*)` })
    .from(recipeReports)
    .where(isNull(recipeReports.resolvedAt));

  const [dmcaRow] = await db
    .select({
      open: sql<number>`count(*) filter (where ${dmcaNotices.status} = 'received')`,
    })
    .from(dmcaNotices);

  return {
    pending: recipeRow?.pending ?? 0,
    approved: recipeRow?.approved ?? 0,
    rejected: recipeRow?.rejected ?? 0,
    reports: reportRow?.open ?? 0,
    dmca: dmcaRow?.open ?? 0,
  };
}

export async function pendingRecipes() {
  return db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      authorName: recipes.authorName,
      authorCountryName: recipes.authorCountryName,
      submittedAt: recipes.submittedAt,
      imageUrl: recipes.imageUrl,
      imageRightsAttestedAt: recipes.imageRightsAttestedAt,
      fiberG: recipeNutrition.fiberG,
      proteinG: recipeNutrition.proteinG,
      confidence: recipeNutrition.confidence,
      unmapped: sql<number>`(
        select count(*) from recipe_ingredients i
        where i.recipe_id = ${recipes.id} and i.mapping_status = 'unmapped'
      )`,
      ingredientCount: sql<number>`(
        select count(*) from recipe_ingredients i
        where i.recipe_id = ${recipes.id}
      )`,
    })
    .from(recipes)
    .leftJoin(recipeNutrition, eq(recipeNutrition.recipeId, recipes.id))
    .where(eq(recipes.status, "pending"))
    .orderBy(asc(recipes.submittedAt));
}

export async function adminRecipe(id: string) {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
  if (!recipe) return null;

  const [ingredients, steps, tags, nutrition, gate] = await Promise.all([
    db
      .select({
        id: recipeIngredients.id,
        position: recipeIngredients.position,
        rawText: recipeIngredients.rawText,
        amount: recipeIngredients.amount,
        unit: recipeIngredients.unit,
        grams: recipeIngredients.grams,
        note: recipeIngredients.note,
        mappingStatus: recipeIngredients.mappingStatus,
        foodFdcId: recipeIngredients.foodFdcId,
        foodName: foods.commonName,
        foodDescription: foods.description,
        fiberG: foods.fiberG,
        proteinG: foods.proteinG,
      })
      .from(recipeIngredients)
      .leftJoin(foods, eq(foods.fdcId, recipeIngredients.foodFdcId))
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(recipeIngredients.position),
    db
      .select({ text: recipeSteps.text })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(recipeSteps.position),
    db
      .select({ tag: recipeTags.tag })
      .from(recipeTags)
      .where(eq(recipeTags.recipeId, id)),
    db
      .select()
      .from(recipeNutrition)
      .where(eq(recipeNutrition.recipeId, id))
      .limit(1),
    publishGate(id),
  ]);

  const strikes = recipe.ipHash
    ? await db
        .select()
        .from(infringementStrikes)
        .where(eq(infringementStrikes.ipHash, recipe.ipHash))
    : [];

  return {
    recipe,
    ingredients,
    steps: steps.map((row) => row.text),
    tags: tags.map((row) => row.tag),
    nutrition: nutrition[0] ?? null,
    gate,
    strikes,
  };
}

export async function mappingQueue(limit = 80) {
  return db
    .select({
      rawText: recipeIngredients.rawText,
      uses: sql<number>`count(*)`,
      recipes: sql<number>`count(distinct ${recipeIngredients.recipeId})`,
    })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.mappingStatus, "unmapped"))
    .groupBy(recipeIngredients.rawText)
    .orderBy(desc(sql`count(*)`), asc(recipeIngredients.rawText))
    .limit(limit);
}

export async function openReports() {
  return db
    .select({
      id: recipeReports.id,
      kind: recipeReports.kind,
      note: recipeReports.note,
      createdAt: recipeReports.createdAt,
      slug: recipes.slug,
      title: recipes.title,
      status: recipes.status,
    })
    .from(recipeReports)
    .innerJoin(recipes, eq(recipes.id, recipeReports.recipeId))
    .where(isNull(recipeReports.resolvedAt))
    .orderBy(asc(recipeReports.createdAt));
}

export async function dmcaList() {
  return db
    .select({
      id: dmcaNotices.id,
      claimantName: dmcaNotices.claimantName,
      claimantEmail: dmcaNotices.claimantEmail,
      workDescription: dmcaNotices.workDescription,
      infringingUrl: dmcaNotices.infringingUrl,
      status: dmcaNotices.status,
      receivedAt: dmcaNotices.receivedAt,
      actionedAt: dmcaNotices.actionedAt,
      recipeTitle: recipes.title,
      recipeSlug: recipes.slug,
    })
    .from(dmcaNotices)
    .leftJoin(recipes, eq(recipes.id, dmcaNotices.recipeId))
    .orderBy(desc(dmcaNotices.receivedAt))
    .limit(100);
}

export async function approvedRecipeForReport(slug: string) {
  const [row] = await db
    .select({ id: recipes.id, title: recipes.title })
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.status, "approved")))
    .limit(1);
  return row ?? null;
}

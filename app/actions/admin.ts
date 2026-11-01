"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  dmcaNotices,
  foodPortions,
  foods,
  infringementStrikes,
  recipeIngredients,
  recipeReports,
  recipes,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import {
  publishGate,
  recipePolicyProblems,
  recomputeRecipe,
} from "@/lib/nutrition/recompute";
import { resolveGrams, type UnitId } from "@/lib/nutrition/units";
import { reviewSchema } from "@/lib/validation";

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const text = value?.toString().trim() ?? "";
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function revalidateRecipe(slug: string) {
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${slug}`);
  revalidatePath("/admin");
}

export async function reviewRecipe(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "save");

  if (!id) redirect("/admin");

  const [existing] = await db
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, id));
  if (!existing) redirect("/admin");

  const parsed = reviewSchema.safeParse({
    action:
      intent === "approve" || intent === "reject" ? intent : "save",
    title: formData.get("title"),
    summary: formData.get("summary") ?? "",
    tips: formData.get("tips") ?? "",
    servings: Number(formData.get("servings") ?? 1),
    servingNote: formData.get("servingNote") ?? "",
    prepMinutes: numberOrNull(formData.get("prepMinutes")),
    cookMinutes: numberOrNull(formData.get("cookMinutes")),
    reviewNote: formData.get("reviewNote") ?? "",
    strike: formData.get("strike") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/admin/recipes/${id}?error=${encodeURIComponent("Check the recipe fields.")}`,
    );
  }

  const data = parsed.data;

  await db
    .update(recipes)
    .set({
      title: data.title,
      summary: data.summary || null,
      tips: data.tips || null,
      servings: data.servings,
      servingNote: data.servingNote || null,
      prepMinutes: data.prepMinutes ?? null,
      cookMinutes: data.cookMinutes ?? null,
      reviewNote: data.reviewNote || null,
    })
    .where(eq(recipes.id, id));

  await recomputeRecipe(id);

  if (data.strike) {
    const [recipe] = await db
      .select({
        ipHash: recipes.ipHash,
        authorHandle: recipes.authorHandle,
      })
      .from(recipes)
      .where(eq(recipes.id, id));
    await db.insert(infringementStrikes).values({
      ipHash: recipe?.ipHash ?? null,
      handle: recipe?.authorHandle ?? null,
      recipeId: id,
      reason: data.reviewNote || "Copyright review",
    });
  }

  if (data.action === "save") {
    const [current] = await db
      .select({ status: recipes.status })
      .from(recipes)
      .where(eq(recipes.id, id));

    if (current?.status === "approved") {
      const policyProblems = await recipePolicyProblems(id);
      if (policyProblems.length) {
        await db
          .update(recipes)
          .set({ status: "pending", reviewedAt: null })
          .where(eq(recipes.id, id));
        revalidateRecipe(existing.slug);
        redirect(
          `/admin/recipes/${id}?error=${encodeURIComponent(
            `Pulled from the catalogue because it now contains pork or alcohol. ${policyProblems.join(
              " · ",
            )}`,
          )}`,
        );
      }
    }
  }

  if (data.action === "approve") {
    const gate = await publishGate(id);
    if (!gate.ok) {
      redirect(
        `/admin/recipes/${id}?error=${encodeURIComponent(gate.problems.join(" · "))}`,
      );
    }
    await db
      .update(recipes)
      .set({
        status: "approved",
        publishedAt: sql`coalesce(${recipes.publishedAt}, (unixepoch() * 1000))`,
        reviewedAt: new Date(),
      })
      .where(eq(recipes.id, id));
  }

  if (data.action === "reject") {
    if (!data.reviewNote) {
      redirect(
        `/admin/recipes/${id}?error=${encodeURIComponent("Add a reason before rejecting — the cook sees it.")}`,
      );
    }
    await db
      .update(recipes)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(recipes.id, id));
  }

  revalidateRecipe(existing.slug);
  redirect(data.action === "save" ? `/admin/recipes/${id}?saved=1` : "/admin");
}

export async function mapIngredient(formData: FormData) {
  await requireAdmin();

  const ingredientId = String(formData.get("ingredientId") ?? "");
  const mode = String(formData.get("mode") ?? "map");
  const fdcId = String(formData.get("fdcId") ?? "");

  const [ingredient] = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.id, ingredientId));
  if (!ingredient) redirect("/admin");

  if (mode === "negligible") {
    await db
      .update(recipeIngredients)
      .set({ mappingStatus: "negligible", grams: null, foodFdcId: null })
      .where(eq(recipeIngredients.id, ingredientId));
    await recomputeRecipe(ingredient.recipeId);
    revalidatePath(`/admin/recipes/${ingredient.recipeId}`);
    redirect(`/admin/recipes/${ingredient.recipeId}?mapped=1`);
  }

  const [food] = await db.select().from(foods).where(eq(foods.fdcId, fdcId));
  if (!food) {
    redirect(
      `/admin/recipes/${ingredient.recipeId}?error=${encodeURIComponent("Pick a food first.")}`,
    );
  }

  const portions = await db
    .select()
    .from(foodPortions)
    .where(eq(foodPortions.fdcId, food.fdcId));

  const grams = resolveGrams(
    ingredient.amount,
    ingredient.unit as UnitId,
    portions,
  );

  if (grams == null) {
    redirect(
      `/admin/recipes/${ingredient.recipeId}?error=${encodeURIComponent(
        `No measured weight for ${ingredient.amount} ${ingredient.unit} of that food. Change the unit to grams first.`,
      )}`,
    );
  }

  await db
    .update(recipeIngredients)
    .set({
      foodFdcId: food.fdcId,
      grams,
      mappingStatus: "mapped",
    })
    .where(eq(recipeIngredients.id, ingredientId));

  await recomputeRecipe(ingredient.recipeId);
  revalidatePath(`/admin/recipes/${ingredient.recipeId}`);
  redirect(`/admin/recipes/${ingredient.recipeId}?mapped=1`);
}

export async function mapAllIngredients(formData: FormData) {
  await requireAdmin();

  const rawText = String(formData.get("rawText") ?? "");
  const mode = String(formData.get("mode") ?? "map");
  const fdcId = String(formData.get("fdcId") ?? "");

  const rows = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.rawText, rawText));

  if (!rows.length) redirect("/admin/foods");

  const affected = new Set<string>();
  let mapped = 0;
  let skipped = 0;

  if (mode === "negligible") {
    await db
      .update(recipeIngredients)
      .set({ mappingStatus: "negligible", grams: null, foodFdcId: null })
      .where(eq(recipeIngredients.rawText, rawText));
    for (const row of rows) affected.add(row.recipeId);
    mapped = rows.length;
  } else {
    const [food] = await db.select().from(foods).where(eq(foods.fdcId, fdcId));
    if (!food) redirect("/admin/foods");
    const portions = await db
      .select()
      .from(foodPortions)
      .where(eq(foodPortions.fdcId, food.fdcId));

    for (const row of rows) {
      const grams = resolveGrams(row.amount, row.unit as UnitId, portions);
      if (grams == null) {
        skipped += 1;
        continue;
      }
      await db
        .update(recipeIngredients)
        .set({ foodFdcId: food.fdcId, grams, mappingStatus: "mapped" })
        .where(eq(recipeIngredients.id, row.id));
      affected.add(row.recipeId);
      mapped += 1;
    }
  }

  for (const recipeId of affected) {
    await recomputeRecipe(recipeId);
  }

  revalidatePath("/admin/foods");
  redirect(`/admin/foods?mapped=${mapped}&skipped=${skipped}`);
}

export async function resolveReport(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "dismiss");

  const [report] = await db
    .select()
    .from(recipeReports)
    .where(eq(recipeReports.id, id));
  if (!report) redirect("/admin/reports");

  if (action === "unpublish") {
    const [recipe] = await db
      .select({ slug: recipes.slug })
      .from(recipes)
      .where(eq(recipes.id, report.recipeId));
    await db
      .update(recipes)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewNote: "Unpublished after a reader report.",
      })
      .where(eq(recipes.id, report.recipeId));
    if (recipe) revalidateRecipe(recipe.slug);
  }

  await db
    .update(recipeReports)
    .set({
      resolvedAt: new Date(),
      resolutionNote: action === "unpublish" ? "Unpublished" : "Dismissed",
    })
    .where(eq(recipeReports.id, id));

  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

export async function handleDmca(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "reject");

  const [notice] = await db
    .select()
    .from(dmcaNotices)
    .where(eq(dmcaNotices.id, id));
  if (!notice) redirect("/admin/dmca");

  if (notice.recipeId) {
    const [recipe] = await db
      .select({
        slug: recipes.slug,
        ipHash: recipes.ipHash,
        authorHandle: recipes.authorHandle,
      })
      .from(recipes)
      .where(eq(recipes.id, notice.recipeId));

    if (action === "uphold") {
      await db
        .update(recipes)
        .set({
          status: "rejected",
          reviewedAt: new Date(),
          reviewNote: "Removed after a copyright notice.",
        })
        .where(eq(recipes.id, notice.recipeId));

      await db.insert(infringementStrikes).values({
        ipHash: recipe?.ipHash ?? null,
        handle: recipe?.authorHandle ?? null,
        recipeId: notice.recipeId,
        reason: `DMCA notice from ${notice.claimantName}`,
      });

      if (recipe) revalidateRecipe(recipe.slug);
    }
  }

  await db
    .update(dmcaNotices)
    .set({
      status: action === "uphold" ? "actioned" : "rejected",
      actionedAt: new Date(),
    })
    .where(eq(dmcaNotices.id, id));

  revalidatePath("/admin/dmca");
  redirect("/admin/dmca");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  foods,
  foodPortions,
  recipeIngredients,
  recipeNutrition,
  recipeSteps,
  recipeTags,
  recipes,
} from "@/lib/db/schema";
import { chunk } from "@/lib/chunks";
import {
  findRestrictedContent,
  restrictedSubmissionMessage,
} from "@/lib/content/restricted";
import { countryName, isValidCountryCode } from "@/lib/countries";
import { computeNutrition, deriveNutritionTags } from "@/lib/nutrition/compute";
import { resolveGrams, type UnitId } from "@/lib/nutrition/units";
import { checkRateLimit, recordEvent } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/request";
import { TERMS_VERSION } from "@/lib/site";
import { submitterToken, uniqueSlug } from "@/lib/slug";
import { verifyTurnstile } from "@/lib/turnstile";
import { isAllowedImageUrl } from "@/lib/upload";
import { submissionSchema } from "@/lib/validation";

export interface SubmitState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function submitRecipe(
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const meta = await requestMeta();

  const limit = await checkRateLimit(meta.ipHash, "submit", {
    perHour: 3,
    perDay: 20,
  });
  if (!limit.ok) return { ok: false, message: limit.message };

  const turnstile = await verifyTurnstile(
    formData.get("cf-turnstile-response")?.toString(),
    meta.ip,
  );
  if (!turnstile.ok) {
    return { ok: false, message: turnstile.message ?? "Spam check failed." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { ok: false, message: "The form could not be read. Please reload." };
  }

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  if (!isValidCountryCode(data.authorCountryCode)) {
    return { ok: false, message: "Pick a valid country." };
  }

  if (!isAllowedImageUrl(data.imageUrl)) {
    return {
      ok: false,
      message: "That photo was not uploaded here. Remove it and add the photo again.",
    };
  }

  if (!data.imageAttested) {
    return {
      ok: false,
      message: "Please confirm you took the photo yourself.",
    };
  }

  const uniqueIds = [...new Set(data.ingredients.map((row) => row.foodFdcId))];
  const foodRows = await db
    .select()
    .from(foods)
    .where(inArray(foods.fdcId, uniqueIds));

  if (foodRows.length !== uniqueIds.length) {
    return {
      ok: false,
      message:
        "One of the ingredients is no longer available. Remove it and search again.",
    };
  }

  const foodMap = new Map(foodRows.map((food) => [food.fdcId, food]));
  const portionRows = await db
    .select()
    .from(foodPortions)
    .where(inArray(foodPortions.fdcId, uniqueIds));

  const portionsByFood = new Map<string, typeof portionRows>();
  for (const portion of portionRows) {
    const list = portionsByFood.get(portion.fdcId) ?? [];
    list.push(portion);
    portionsByFood.set(portion.fdcId, list);
  }

  const resolved = data.ingredients.map((ingredient, position) => {
    const food = foodMap.get(ingredient.foodFdcId)!;
    const grams = resolveGrams(
      ingredient.amount,
      ingredient.unit as UnitId,
      portionsByFood.get(food.fdcId) ?? [],
    );
    return { ingredient, position, food, grams };
  });

  const unresolved = resolved.find((row) => row.grams == null);
  if (unresolved) {
    return {
      ok: false,
      message: `We can't convert ${unresolved.ingredient.amount} ${unresolved.ingredient.unit} of ${
        unresolved.food.commonName ?? unresolved.food.description
      }. Choose a different unit for that ingredient.`,
    };
  }

  const restrictedHits = findRestrictedContent({
    title: data.title,
    summary: data.summary,
    tips: data.tips,
    ingredients: resolved.map((row) => ({
      text: [row.food.commonName, row.food.description]
        .filter(Boolean)
        .join(" "),
      note: row.ingredient.note,
    })),
    steps: data.steps,
  });

  if (restrictedHits.length) {
    return {
      ok: false,
      message: restrictedSubmissionMessage(restrictedHits),
    };
  }

  const nutrition = computeNutrition(
    resolved.map((row) => ({
      grams: row.grams,
      food: row.food,
      mappingStatus: "mapped" as const,
    })),
    data.servings,
  );

  if (nutrition.confidence !== "computed") {
    return {
      ok: false,
      message: "We could not compute nutrition for every ingredient.",
    };
  }

  const token = submitterToken();

  const [created] = await db
    .insert(recipes)
    .values({
      slug: uniqueSlug(data.title),
      title: data.title,
      summary: data.summary || null,
      status: "pending",
      authorName: data.authorName,
      authorCountryCode: data.authorCountryCode.toUpperCase(),
      authorCountryName: countryName(data.authorCountryCode),
      authorHandle: data.authorHandle
        ? data.authorHandle.startsWith("@")
          ? data.authorHandle
          : `@${data.authorHandle}`
        : null,
      servings: data.servings,
      servingNote: data.servingNote || null,
      servingGrams: data.servingGrams ?? null,
      prepMinutes: data.prepMinutes ?? null,
      cookMinutes: data.cookMinutes ?? null,
      tips: data.tips || null,
      imageUrl: data.imageUrl,
      imageAlt: `${data.title}, cooked by ${data.authorName}`,
      imageSha256: data.imageSha256 || null,
      imageRightsAttestedAt: new Date(),
      termsVersion: TERMS_VERSION,
      submitterToken: token,
      ipHash: meta.ipHash,
    })
    .returning({ id: recipes.id });

  for (const batch of chunk(
    resolved.map((row) => ({
      recipeId: created.id,
      position: row.position,
      rawText: `${row.ingredient.amount} ${row.ingredient.unit} ${
        row.food.commonName ?? row.food.description
      }`.trim(),
      amount: row.ingredient.amount,
      unit: row.ingredient.unit,
      foodFdcId: row.food.fdcId,
      grams: row.grams,
      note: row.ingredient.note || null,
      mappingStatus: "mapped" as const,
    })),
    10,
  )) {
    await db.insert(recipeIngredients).values(batch);
  }

  for (const batch of chunk(
    data.steps.map((text, position) => ({
      recipeId: created.id,
      position,
      text,
    })),
    20,
  )) {
    await db.insert(recipeSteps).values(batch);
  }

  await db.insert(recipeNutrition).values({
    recipeId: created.id,
    ...nutrition.perServing,
    confidence: "computed",
  });

  const tags = new Set<string>([
    ...deriveNutritionTags(nutrition.perServing),
    ...data.dietTags,
    ...(data.dietTags.includes("vegan") ? ["vegetarian"] : []),
    ...data.allergens.map((allergen) => `allergen_${allergen}`),
  ]);

  for (const batch of chunk(
    [...tags].map((tag) => ({ recipeId: created.id, tag })),
    40,
  )) {
    await db.insert(recipeTags).values(batch).onConflictDoNothing();
  }

  await db
    .update(foods)
    .set({ useCount: sql`${foods.useCount} + 1` })
    .where(inArray(foods.fdcId, uniqueIds));

  await recordEvent(meta.ipHash, "submit");

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/admin");

  console.info(`[submission] received "${data.title}" (${created.id})`);

  redirect(`/status/${token}?new=1`);
}

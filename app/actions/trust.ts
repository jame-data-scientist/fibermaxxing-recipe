"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { dmcaNotices, recipeReports, recipes } from "@/lib/db/schema";
import { checkRateLimit, recordEvent } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/request";
import { SITE_URL } from "@/lib/site";
import { dmcaSchema, reportSchema } from "@/lib/validation";

async function recipeFromUrl(url: string) {
  try {
    const path = new URL(url, SITE_URL).pathname;
    const match = path.match(/\/recipes\/([^/]+)/);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]);
    const [row] = await db
      .select({ id: recipes.id, slug: recipes.slug })
      .from(recipes)
      .where(eq(recipes.slug, slug))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function submitDmca(formData: FormData) {
  const meta = await requestMeta();

  const limit = await checkRateLimit(meta.ipHash, "dmca", {
    perHour: 5,
    perDay: 20,
  });
  if (!limit.ok) {
    redirect(`/dmca?error=${encodeURIComponent(limit.message)}`);
  }

  const parsed = dmcaSchema.safeParse({
    claimantName: formData.get("claimantName"),
    claimantEmail: formData.get("claimantEmail"),
    workDescription: formData.get("workDescription"),
    infringingUrl: formData.get("infringingUrl"),
    goodFaith: formData.get("goodFaith") === "on",
    accuracy: formData.get("accuracy") === "on",
    signature: formData.get("signature"),
  });

  if (!parsed.success) {
    redirect(
      `/dmca?error=${encodeURIComponent(
        "Please complete every field and both statements.",
      )}`,
    );
  }

  const data = parsed.data;
  const recipe = await recipeFromUrl(data.infringingUrl);

  const [notice] = await db
    .insert(dmcaNotices)
    .values({
      recipeId: recipe?.id ?? null,
      claimantName: data.claimantName,
      claimantEmail: data.claimantEmail,
      workDescription: data.workDescription,
      infringingUrl: data.infringingUrl,
      goodFaith: data.goodFaith,
      accuracy: data.accuracy,
      signature: data.signature,
      status: "received",
    })
    .returning({ id: dmcaNotices.id });

  // A notice that resolves to one of our recipes comes down immediately; the
  // 48-hour promise is an upper bound, not a target.
  if (recipe) {
    await db
      .update(recipes)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewNote: "Removed after a copyright notice.",
      })
      .where(eq(recipes.id, recipe.id));

    await db
      .update(dmcaNotices)
      .set({ status: "actioned", actionedAt: new Date() })
      .where(eq(dmcaNotices.id, notice.id));

    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipe.slug}`);
  }

  await recordEvent(meta.ipHash, "dmca");
  redirect("/dmca?received=1");
}

export async function submitReport(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const meta = await requestMeta();

  const limit = await checkRateLimit(meta.ipHash, "report", {
    perHour: 5,
    perDay: 20,
  });
  if (!limit.ok) {
    redirect(
      `/recipes/${encodeURIComponent(slug)}/report?error=${encodeURIComponent(limit.message)}`,
    );
  }

  const parsed = reportSchema.safeParse({
    kind: formData.get("kind"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    redirect(
      `/recipes/${encodeURIComponent(slug)}/report?error=${encodeURIComponent("Pick a reason for the report.")}`,
    );
  }

  const [recipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1);

  if (!recipe) redirect("/recipes");

  await db.insert(recipeReports).values({
    recipeId: recipe.id,
    kind: parsed.data.kind,
    note: parsed.data.note || null,
  });

  await recordEvent(meta.ipHash, "report");
  redirect(`/recipes/${encodeURIComponent(slug)}/report?sent=1`);
}

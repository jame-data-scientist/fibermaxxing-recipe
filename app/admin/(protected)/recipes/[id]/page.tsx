import Link from "next/link";
import { notFound } from "next/navigation";

import { reviewRecipe } from "@/app/actions/admin";
import { IngredientMapper } from "@/components/admin/ingredient-mapper";
import { NutrientPanel } from "@/components/nutrient-panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { computeRecipePanel, scalePanel } from "@/lib/nutrition/panel";
import { adminRecipe } from "@/lib/queries/admin";
import { absoluteUrl } from "@/lib/site";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; mapped?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const data = await adminRecipe(id);
  if (!data) notFound();

  const { recipe, ingredients, steps, tags, nutrition, gate, strikes } = data;

  const panel = computeRecipePanel(ingredients, recipe.servings);
  const hundredGramPanel =
    recipe.servingGrams && recipe.servingGrams > 0
      ? scalePanel(panel, 100 / recipe.servingGrams)
      : null;

  const imageSrc = recipe.imageUrl?.startsWith("http")
    ? recipe.imageUrl
    : recipe.imageUrl
      ? absoluteUrl(recipe.imageUrl)
      : null;

  const lensUrl = imageSrc
    ? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageSrc)}`
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-moss hover:text-forest"
          >
            ← Queue
          </Link>
          <h1 className="display mt-2 text-3xl">{recipe.title}</h1>
          <p className="mt-1 text-[12px] text-moss">
            {recipe.authorName} · {recipe.authorCountryName} · submitted{" "}
            {formatDate(recipe.submittedAt)} · status{" "}
            <span className="uppercase">{recipe.status}</span>
          </p>
        </div>
        {recipe.status === "approved" ? (
          <Link
            href={`/recipes/${recipe.slug}`}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-forest underline"
          >
            View public page →
          </Link>
        ) : null}
      </div>

      {query.error ? (
        <div className="mt-5 border-l-2 border-rust bg-rust/5 px-4 py-3 text-[13px] text-rust">
          {query.error}
        </div>
      ) : null}
      {query.saved ? (
        <div className="mt-5 border-l-2 border-lime bg-lime-soft/30 px-4 py-3 text-[13px] text-forest">
          Saved.
        </div>
      ) : null}
      {query.mapped ? (
        <div className="mt-5 border-l-2 border-lime bg-lime-soft/30 px-4 py-3 text-[13px] text-forest">
          Ingredient updated and nutrition recomputed.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <section className="border border-line p-5">
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="eyebrow">Publish gate</h2>
              <span
                className={`font-mono text-[10px] uppercase ${gate.ok ? "text-forest" : "text-rust"}`}
              >
                {gate.ok ? "Passing" : "Blocked"}
              </span>
            </div>
            {gate.ok ? (
              <p className="mt-3 text-[13px] text-moss">
                Every ingredient is mapped or marked negligible, the nutrition is
                computed, and the photo rules are met.
              </p>
            ) : (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-rust">
                {gate.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6">
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="eyebrow">Ingredients</h2>
              <span className="font-mono text-[10px] text-moss">
                {ingredients.length} rows
              </span>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {ingredients.map((ingredient) => (
                <li key={ingredient.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] text-forest">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                    <span className="text-[13px] text-ink">
                      {ingredient.foodName ??
                        ingredient.foodDescription ??
                        ingredient.rawText}
                    </span>
                    <span className="font-mono text-[10px] text-moss">
                      {ingredient.grams != null
                        ? `${formatNumber(ingredient.grams)} g`
                        : "no weight"}{" "}
                      · {ingredient.mappingStatus}
                    </span>
                    {ingredient.foodFdcId ? (
                      <span className="font-mono text-[10px] text-moss">
                        fdc {ingredient.foodFdcId}
                      </span>
                    ) : null}
                  </div>
                  {ingredient.note ? (
                    <p className="mt-0.5 text-[11px] text-moss">
                      note: {ingredient.note}
                    </p>
                  ) : null}

                  {ingredient.mappingStatus === "unmapped" ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <IngredientMapper
                        ingredientId={ingredient.id}
                        placeholder={`Find “${ingredient.rawText}”`}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <NutrientPanel
            embedded
            panel={panel}
            perHundredPanel={hundredGramPanel}
            servingNote={recipe.servingNote}
            servingGrams={recipe.servingGrams}
          />

          <section className="mt-6">
            <div className="border-b border-line pb-3">
              <h2 className="eyebrow">Method</h2>
            </div>
            <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink/90">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="font-mono text-[10px] text-moss">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <form action={reviewRecipe} className="mt-8 border border-line p-5">
            <input type="hidden" name="id" value={recipe.id} />

            <h2 className="eyebrow">Edit & decide</h2>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={recipe.title}
                  maxLength={90}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  name="summary"
                  rows={2}
                  defaultValue={recipe.summary ?? ""}
                  maxLength={240}
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    name="servings"
                    type="number"
                    min={1}
                    max={24}
                    defaultValue={recipe.servings}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="servingNote">Serving</Label>
                  <Input
                    id="servingNote"
                    name="servingNote"
                    defaultValue={recipe.servingNote ?? ""}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="prepMinutes">Prep</Label>
                  <Input
                    id="prepMinutes"
                    name="prepMinutes"
                    type="number"
                    min={0}
                    defaultValue={recipe.prepMinutes ?? ""}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="cookMinutes">Cook</Label>
                  <Input
                    id="cookMinutes"
                    name="cookMinutes"
                    type="number"
                    min={0}
                    defaultValue={recipe.cookMinutes ?? ""}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tips">Cook's note</Label>
                <Textarea
                  id="tips"
                  name="tips"
                  rows={2}
                  defaultValue={recipe.tips ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="reviewNote" hint="Shown to the cook if rejected">
                  Reviewer note
                </Label>
                <Textarea
                  id="reviewNote"
                  name="reviewNote"
                  rows={2}
                  defaultValue={recipe.reviewNote ?? ""}
                  maxLength={600}
                  className="mt-1.5"
                />
              </div>

              <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-moss">
                <input
                  type="checkbox"
                  name="strike"
                  className="mt-0.5 h-4 w-4 accent-[#A93A20]"
                />
                Record an infringement strike for this submission
                {strikes.length
                  ? ` (${strikes.length} already on record)`
                  : ""}
                . Two valid strikes block future submissions.
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" name="intent" value="approve" size="sm">
                Approve & publish
              </Button>
              <Button
                type="submit"
                name="intent"
                value="save"
                variant="secondary"
                size="sm"
              >
                Save changes
              </Button>
              <Button
                type="submit"
                name="intent"
                value="reject"
                variant="danger"
                size="sm"
              >
                Reject
              </Button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          {recipe.imageUrl ? (
            <div className="border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={recipe.imageUrl}
                alt="Submitted dish"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="space-y-2 border-t border-line p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em]">
                  Photo attestation:{" "}
                  <span
                    className={
                      recipe.imageRightsAttestedAt ? "text-forest" : "text-rust"
                    }
                  >
                    {recipe.imageRightsAttestedAt
                      ? `yes, ${formatDate(recipe.imageRightsAttestedAt)}`
                      : "missing"}
                  </span>
                </p>
                {recipe.imageSha256 ? (
                  <p className="break-all font-mono text-[9px] text-moss">
                    sha256 {recipe.imageSha256.slice(0, 24)}…
                  </p>
                ) : null}
                {lensUrl ? (
                  <a
                    href={lensUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block font-mono text-[10px] uppercase tracking-[0.08em] text-forest underline"
                  >
                    Reverse image search →
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-line-strong p-4 text-[12px] text-moss">
              No photo. The public page will use a typographic card.
            </div>
          )}

          <div className="border border-line p-4">
            <p className="eyebrow">Per serving</p>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              {[
                ["Fibre", nutrition?.fiberG],
                ["Protein", nutrition?.proteinG],
                ["Calories", nutrition?.kcal],
                ["Carbs", nutrition?.carbsG],
                ["Fat", nutrition?.fatG],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-moss">{label}</dt>
                  <dd className="font-mono">
                    {formatNumber(Number(value ?? 0))}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-moss">
              {nutrition?.confidence ?? "no nutrition"}
            </p>
          </div>

          <div className="border border-line p-4">
            <p className="eyebrow">Tags</p>
            <p className="mt-2 text-[11px] leading-relaxed text-moss">
              {tags.length ? tags.join(" · ") : "None"}
            </p>
          </div>

          {strikes.length ? (
            <div className="border border-rust/40 bg-rust/5 p-4">
              <p className="eyebrow text-rust">Strikes on record</p>
              <ul className="mt-2 space-y-1 text-[11px] text-rust">
                {strikes.map((strike) => (
                  <li key={strike.id}>
                    {formatDate(strike.createdAt)} — {strike.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {recipe.authorHandle ? (
            <p className="font-mono text-[10px] text-moss">
              handle {recipe.authorHandle}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

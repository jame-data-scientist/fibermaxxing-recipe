import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MacroStrip } from "@/components/macro-strip";
import { NutrientPanel } from "@/components/nutrient-panel";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeCover } from "@/components/recipe-cover";
import { UnitToggle } from "@/components/unit-toggle";
import { buttonVariants } from "@/components/ui/button";
import { perHundredGrams } from "@/lib/nutrition/compute";
import {
  computeRecipePanel,
  scalePanel,
} from "@/lib/nutrition/panel";
import {
  getRecipeBySlug,
  relatedRecipes,
  type RecipeListItem,
} from "@/lib/queries/recipes";
import { SITE_NAME, TAG_LABELS, absoluteUrl } from "@/lib/site";
import { formatDate, formatMinutes, formatNumber } from "@/lib/utils";

// D1 is queried over a no-store POST, which Next cannot prerender at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found" };

  return {
    title: recipe.title,
    description:
      recipe.summary ??
      `${formatNumber(recipe.fiberG)} g fibre and ${formatNumber(recipe.proteinG)} g protein per serving, calculated from USDA data.`,
    openGraph: {
      title: recipe.title,
      description:
        recipe.summary ??
        `${formatNumber(recipe.fiberG)} g fibre · ${formatNumber(recipe.proteinG)} g protein per serving`,
      type: "article",
      publishedTime: recipe.publishedAt?.toISOString(),
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const related = await relatedRecipes(slug, recipe.tags);
  const panel = computeRecipePanel(recipe.ingredients, recipe.servings);
  const hundredGramPanel =
    recipe.servingGrams && recipe.servingGrams > 0
      ? scalePanel(panel, 100 / recipe.servingGrams)
      : null;
  const per100 = perHundredGrams(
    {
      kcal: recipe.kcal,
      proteinG: recipe.proteinG,
      carbsG: recipe.carbsG,
      fatG: recipe.fatG,
      fiberG: recipe.fiberG,
      sugarG: 0,
      sodiumMg: 0,
    },
    recipe.servingGrams,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.summary ?? undefined,
    image: [absoluteUrl(`/recipes/${recipe.slug}/card.png`)],
    author: { "@type": "Person", name: recipe.authorName },
    datePublished: recipe.publishedAt?.toISOString(),
    recipeYield: `${recipe.servings} servings`,
    prepTime: recipe.prepMinutes ? `PT${recipe.prepMinutes}M` : undefined,
    cookTime: recipe.cookMinutes ? `PT${recipe.cookMinutes}M` : undefined,
    recipeCategory: "Main course",
    recipeCuisine: recipe.authorCountryName,
    keywords: recipe.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(", "),
    recipeIngredient: recipe.ingredients.map((ingredient) =>
      ingredient.note
        ? `${ingredient.rawText} (${ingredient.note})`
        : ingredient.rawText,
    ),
    recipeInstructions: recipe.steps.map((text) => ({
      "@type": "HowToStep",
      text,
    })),
    nutrition: {
      "@type": "NutritionInformation",
      servingSize: recipe.servingNote ?? "1 serving",
      calories: `${Math.round(recipe.kcal)} kcal`,
      proteinContent: `${formatNumber(recipe.proteinG)} g`,
      fiberContent: `${formatNumber(recipe.fiberG)} g`,
      carbohydrateContent: `${formatNumber(recipe.carbsG)} g`,
      fatContent: `${formatNumber(recipe.fatG)} g`,
    },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="container-page pt-8">
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-moss">
          <Link href="/recipes" className="hover:text-forest">
            Recipes
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-ink/70">{recipe.title}</span>
        </nav>

        <header className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {recipe.tags
                .filter((tag) =>
                  ["high_fiber", "high_protein", "both"].includes(tag),
                )
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-forest/20 bg-lime-soft/50 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-forest"
                  >
                    {TAG_LABELS[tag]}
                  </span>
                ))}
            </div>

            <h1 className="display mt-4 text-[clamp(2.4rem,5vw,3.9rem)]">
              {recipe.title}
            </h1>

            {recipe.summary ? (
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-moss">
                {recipe.summary}
              </p>
            ) : null}

            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4 text-[12px]">
              <div>
                <dt className="eyebrow">Cook</dt>
                <dd className="mt-0.5 text-ink">
                  {recipe.authorName}
                  {recipe.authorHandle ? (
                    <span className="text-moss"> · {recipe.authorHandle}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Country</dt>
                <dd className="mt-0.5 text-ink">{recipe.authorCountryName}</dd>
              </div>
              <div>
                <dt className="eyebrow">Time</dt>
                <dd className="mt-0.5 text-ink">
                  {formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Makes</dt>
                <dd className="mt-0.5 text-ink">
                  {recipe.servings} servings
                  {recipe.servingNote ? (
                    <span className="text-moss"> · {recipe.servingNote}</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>

          <RecipeCover
            recipe={recipe as RecipeListItem}
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="aspect-[4/3] w-full border border-line"
          />
        </header>

        <MacroStrip
          fiber={recipe.fiberG}
          protein={recipe.proteinG}
          kcal={recipe.kcal}
          carbs={recipe.carbsG}
          fat={recipe.fatG}
          size="lg"
          className="mt-10"
        />
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-moss">
          Per serving · calculated from USDA FoodData Central
        </p>
      </div>

      {/*
        Phone order: ingredients → method → nutrition and app link.
        Desktop keeps the two-column layout, with the method spanning both
        sidebar rows.
      */}
      <div className="container-page mt-12 grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-12">
        <aside className="lg:col-start-1 lg:row-start-1">
          <UnitToggle ingredients={recipe.ingredients} />

          <div className="mt-6 border border-line bg-paper-deep/40 p-4">
            <p className="eyebrow">Serving</p>
            <p className="mt-2 text-[13px] leading-relaxed text-moss">
              Makes {recipe.servings} servings
              {recipe.servingGrams
                ? ` · about ${formatNumber(recipe.servingGrams, 0)} g each`
                : ""}
              . Values below are per serving.
            </p>
          </div>
        </aside>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section aria-labelledby="method">
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 id="method" className="eyebrow">
                Method
              </h2>
              <span className="font-mono text-[10px] text-moss">
                {recipe.steps.length} steps
              </span>
            </div>
            <ol className="mt-5 space-y-6">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-4 sm:gap-5">
                  <span className="mt-1 shrink-0 font-mono text-[11px] text-forest">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[15px] leading-relaxed text-ink/90">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tips ? (
            <section className="mt-10 border-l-2 border-lime bg-paper-deep/50 px-5 py-4">
              <p className="eyebrow">Cook&apos;s note</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink/90">
                {recipe.tips}
              </p>
            </section>
          ) : null}

          <section className="mt-10 border-t border-line pt-5">
            <p className="text-[11px] leading-relaxed text-moss">
              Reviewed by a human on {formatDate(recipe.publishedAt)}. Nutrition
              is an estimate derived from USDA data, not a laboratory analysis,
              and is not medical advice. If you are increasing fibre, do it
              gradually and drink water.
            </p>
          </section>
        </div>

        <aside className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <div>
            <p className="eyebrow">Nutrition per serving</p>
            <table className="mt-3 w-full border-collapse text-[13px]">
              <tbody>
                {[
                  ["Calories", `${Math.round(recipe.kcal)} kcal`],
                  ["Protein", `${formatNumber(recipe.proteinG)} g`],
                  ["Carbohydrate", `${formatNumber(recipe.carbsG)} g`],
                  ["Fat", `${formatNumber(recipe.fatG)} g`],
                  ["Fibre", `${formatNumber(recipe.fiberG)} g`],
                ].map(([label, value]) => (
                  <tr key={label} className="border-t border-line">
                    <th scope="row" className="py-2 text-left font-normal text-moss">
                      {label}
                    </th>
                    <td className="py-2 text-right font-mono tabular-nums text-ink">
                      {value}
                    </td>
                  </tr>
                ))}
                {per100 ? (
                  <tr className="border-t border-line">
                    <th scope="row" className="py-2 text-left font-normal text-moss">
                      Fibre per 100 g
                    </th>
                    <td className="py-2 text-right font-mono tabular-nums text-ink">
                      {formatNumber(per100.fiberG)} g
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {panel.count ? (
              <a
                href="#full-nutrition"
                className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-forest underline decoration-line-strong underline-offset-4"
              >
                Full nutrient panel <span aria-hidden="true">↓</span>
              </a>
            ) : null}

            <details className="mt-4 text-[12px] leading-relaxed text-moss">
              <summary className="cursor-pointer font-medium text-forest">
                How this was calculated
              </summary>
              <p className="mt-2">
                Each ingredient is matched to a USDA FoodData Central record.
                Quantities are converted to grams through published portion
                weights (a cup of oats is 156 g, not a guess), summed, then
                divided by {recipe.servings} servings. These are estimates, not
                lab tests, and not medical advice.
              </p>
            </details>
          </div>

          <a
            href={`/go/android?utm_source=recipe&recipe=${recipe.slug}`}
            className="mt-6 block border border-forest bg-forest p-4 text-paper hover:bg-forest-soft"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-lime">
              FiberMaxxing for Android
            </span>
            <span className="mt-2 block text-[14px] leading-snug">
              Track this recipe against your daily fibre target.
            </span>
            <span className="mt-2 block font-mono text-[11px] text-paper/70">
              Open Google Play →
            </span>
          </a>

          <p className="mt-5 text-[11px] leading-relaxed text-moss">
            Something wrong with this recipe?{" "}
            <Link
              href={`/recipes/${recipe.slug}/report`}
              className="text-rust underline decoration-rust/30 underline-offset-2"
            >
              Report it
            </Link>
            . Allergen information is cook-reported — always check labels.
          </p>
        </aside>
      </div>

      <NutrientPanel
        panel={panel}
        perHundredPanel={hundredGramPanel}
        servingNote={recipe.servingNote}
        servingGrams={recipe.servingGrams}
      />

      {related.length ? (
        <section className="container-page mt-20 border-t border-line pt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-[clamp(1.8rem,3.4vw,2.5rem)]">
              Cook this next
            </h2>
            <Link
              href="/recipes"
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-forest underline decoration-line-strong underline-offset-4"
            >
              All recipes →
            </Link>
          </div>
          <div className="mt-8 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <RecipeCard key={item.id} recipe={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="container-page mt-16">
        <div className="flex flex-col items-start justify-between gap-5 border border-line bg-paper-deep/40 px-6 py-7 sm:flex-row sm:items-center">
          <div>
            <p className="display text-2xl">Got a recipe worth sharing?</p>
            <p className="mt-1 text-[13px] text-moss">
              We publish the cook&apos;s name and country, and we do the maths.
            </p>
          </div>
          <Link href="/submit" className={buttonVariants({ size: "md" })}>
            Submit a recipe
          </Link>
        </div>
      </div>

      <p className="container-page mt-6 text-[10px] text-moss">
        {SITE_NAME} · {recipe.authorCountryName}
      </p>
    </article>
  );
}

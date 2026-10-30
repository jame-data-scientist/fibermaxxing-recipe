import Link from "next/link";

import { MacroStrip } from "@/components/macro-strip";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeCover } from "@/components/recipe-cover";
import { buttonVariants } from "@/components/ui/button";
import {
  featuredRecipe,
  latestRecipes,
  recipeStats,
} from "@/lib/queries/recipes";
import { cn, formatNumber } from "@/lib/utils";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, latest, stats] = await Promise.all([
    featuredRecipe(),
    latestRecipes(6),
    recipeStats(),
  ]);

  const rest = latest.filter((recipe) => recipe.slug !== featured?.slug);

  return (
    <>
      <section className="container-page pt-14 pb-16 md:pt-20">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="eyebrow flex items-center gap-3">
              <span className="inline-block h-px w-8 bg-line-strong" />
              Real cooks · USDA-computed nutrition
            </p>

            <h1 className="display mt-6 text-[clamp(2.5rem,7.4vw,5.6rem)] text-ink">
              Fibre you can{" "}
              <br className="hidden sm:block" />
              <span className="italic text-forest">actually count.</span>
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-moss">
              Every recipe here comes from a person who cooked it. Every gram of
              fibre and protein is calculated from USDA FoodData Central — by
              weight, per serving — so the number on the card is the number in
              the bowl.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/recipes" className={buttonVariants({ size: "lg" })}>
                Browse the recipes
              </Link>
              <Link
                href="/submit"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Submit yours
              </Link>
            </div>

            <dl className="mt-11 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-5">
              {[
                { label: "Recipes", value: stats.total },
                { label: "High fibre", value: stats.highFiber },
                { label: "Both targets", value: stats.both },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="eyebrow">{stat.label}</dt>
                  <dd className="mt-1 font-mono text-[26px] tracking-tight text-ink">
                    {formatNumber(stat.value, 0)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {featured ? (
            <div className="relative">
              <div
                className="absolute -inset-2 border border-line-strong/70"
                aria-hidden="true"
              />
              <div className="relative border border-ink/15 bg-paper">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="eyebrow">Featured this week</span>
                  <span className="font-mono text-[10px] text-moss">
                    {featured.authorCountryName}
                  </span>
                </div>
                <Link href={`/recipes/${featured.slug}`} className="block">
                  <RecipeCover
                    recipe={featured}
                    priority
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="aspect-[4/5] w-full"
                  />
                </Link>
                <div className="p-4">
                  <MacroStrip
                    fiber={featured.fiberG}
                    protein={featured.proteinG}
                    kcal={featured.kcal}
                    carbs={featured.carbsG}
                    fat={featured.fatG}
                    size="sm"
                    className="border-t-0"
                  />
                  <Link
                    href={`/recipes/${featured.slug}`}
                    className="mt-4 flex items-baseline justify-between gap-4"
                  >
                    <span className="display text-2xl leading-tight">
                      {featured.title}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] text-forest">
                      Open →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-line-strong p-10 text-center">
              <p className="display text-2xl">The kitchen is warming up.</p>
              <Link
                href="/submit"
                className={cn(buttonVariants({ size: "sm" }), "mt-4")}
              >
                Be the first recipe
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-line bg-paper-deep/40 py-3">
        <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-moss">
          <span>High fibre ≥ 8 g / serving</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>High protein ≥ 25 g / serving</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Tags earned from the numbers, not claimed</span>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">From the kitchen</p>
            <h2 className="display mt-3 text-[clamp(2rem,4vw,3rem)]">
              Latest recipes
            </h2>
          </div>
          <Link
            href="/recipes"
            className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-forest underline decoration-line-strong underline-offset-4 hover:decoration-forest sm:block"
          >
            All {stats.total} recipes →
          </Link>
        </div>

        {rest.length ? (
          <div className="mt-10 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                priority={index < 2}
              />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-moss">
            More recipes are on the way.{" "}
            <Link href="/submit" className="text-forest underline">
              Submit one
            </Link>
            .
          </p>
        )}
      </section>

      <section className="border-t border-line">
        <div className="container-page grid gap-10 py-16 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Someone actually cooked it",
              body: "Each recipe is submitted by the cook, with their name and country attached. No scraped feeds, no ghost-written filler.",
            },
            {
              n: "02",
              title: "We weigh it, then divide",
              body: "Ingredients are matched to USDA records, converted to grams through published portion weights, and summed per serving.",
            },
            {
              n: "03",
              title: "The badge is earned",
              body: "High fibre and high protein are computed, not ticked in a form. If a recipe misses the bar, it does not get the badge.",
            },
          ].map((step) => (
            <div key={step.n}>
              <span className="font-mono text-[11px] text-forest">{step.n}</span>
              <h3 className="display mt-3 text-[1.6rem] leading-tight">
                {step.title}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-moss">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-8">
        <div className="relative overflow-hidden bg-forest px-7 py-12 text-paper sm:px-12 sm:py-14">
          <div className="relative z-10 max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-lime">
              FiberMaxxing for Android
            </p>
            <h2 className="display mt-4 text-[clamp(2rem,4.4vw,3.2rem)] text-paper">
              Log the fibre, not just the calories.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-paper/70">
              The app tracks fibre against your target, backs up your diary, and
              keeps these recipes one tap away.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/go/android?utm_source=home"
                className={buttonVariants({ variant: "lime", size: "lg" })}
              >
                Get it on Google Play
              </a>
              <Link
                href="/submit"
                className="inline-flex h-12 items-center rounded-full border border-paper/25 px-6 text-[15px] text-paper hover:border-lime hover:text-lime"
              >
                Submit a recipe
              </Link>
            </div>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-lime/20"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full border border-lime/10"
          />
        </div>
      </section>
    </>
  );
}

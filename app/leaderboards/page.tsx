import type { Metadata } from "next";
import Link from "next/link";

import {
  CountryStandings,
  RecipeStandings,
} from "@/components/leaderboard";
import { buttonVariants } from "@/components/ui/button";
import {
  countryStandings,
  recipeLeaderboard,
} from "@/lib/queries/recipes";

// D1 is queried over a no-store POST, which Next cannot prerender at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "The countries with the most published recipes, and the highest-fibre, highest-protein and best all-round dishes in the FiberMaxxing Kitchen collection.",
};

export default async function LeaderboardsPage() {
  const [countries, fiber, protein, both] = await Promise.all([
    countryStandings(10),
    recipeLeaderboard("fiber", 8),
    recipeLeaderboard("protein", 8),
    recipeLeaderboard("both", 8),
  ]);

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">The standings</p>
        <h1 className="display mt-3 text-[clamp(2.6rem,5.6vw,4rem)]">
          The top of <span className="italic text-forest">the stack.</span>
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-moss">
          Every number below is computed per serving from USDA FoodData Central,
          not claimed by the cook. The boards move the moment a recipe is
          approved.
        </p>
      </header>

      <section className="mt-14 grid gap-8 border-t border-line pt-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-14">
        <div>
          <p className="eyebrow">01 · Countries</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,3.6vw,2.5rem)]">
            Most recipes at the table
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-moss">
            Published recipes credited to each country. Open one to see its
            kitchen.
          </p>
        </div>
        <CountryStandings rows={countries} />
      </section>

      <div className="mt-16 grid gap-12 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
        <section>
          <p className="eyebrow">02 · Fibre</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,3.6vw,2.4rem)]">
            Most fibre
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-moss">
            Grams per serving
          </p>
          <RecipeStandings metric="fiber" recipes={fiber} />
        </section>

        <section>
          <p className="eyebrow">03 · Protein</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,3.6vw,2.4rem)]">
            Most protein
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-moss">
            Grams per serving
          </p>
          <RecipeStandings metric="protein" recipes={protein} />
        </section>

        <section>
          <p className="eyebrow">04 · Both</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,3.6vw,2.4rem)]">
            Best of both
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-moss">
            Fibre + protein · 8 g / 25 g minimum
          </p>
          <RecipeStandings metric="both" recipes={both} />
        </section>
      </div>

      <section className="mt-16 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="display text-2xl">Think your bowl belongs here?</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-moss">
            Submit it with a photo and real amounts. We do the arithmetic.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/recipes"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Browse all recipes
          </Link>
          <Link href="/submit" className={buttonVariants({ size: "sm" })}>
            Submit a recipe
          </Link>
        </div>
      </section>

      <p className="mt-10 text-[11px] leading-relaxed text-moss/80">
        High fibre is 8 g or more per serving; high protein is 25 g or more. The
        both board ranks only recipes that clear both bars, by their combined
        grams. Nutrition is an estimate, not medical advice.
      </p>
    </div>
  );
}

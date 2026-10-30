import type { Metadata } from "next";
import Link from "next/link";

import { RecipeCard } from "@/components/recipe-card";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import {
  browseRecipes,
  recipeCountries,
  type BrowseFilters,
} from "@/lib/queries/recipes";
import { DIET_TAGS, PAGE_SIZE, TAG_LABELS } from "@/lib/site";
import { cn, formatNumber } from "@/lib/utils";

// D1 is queried over a no-store POST, which Next cannot prerender at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All recipes",
  description:
    "Browse high-fibre and high-protein recipes from real cooks, filtered by diet and country. Nutrition calculated from USDA data.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const TAGS = [
  { value: "", label: "All recipes" },
  { value: "high_fiber", label: "High fibre" },
  { value: "high_protein", label: "High protein" },
  { value: "both", label: "Both" },
];

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);

  const filters: BrowseFilters = {
    tag: first(params.tag),
    diet: first(params.diet),
    country: first(params.country),
    q: first(params.q)?.slice(0, 80),
    sort: (first(params.sort) as BrowseFilters["sort"]) ?? "newest",
    page,
  };

  const [{ recipes, total, pageCount, hasMore }, countries] = await Promise.all([
    browseRecipes(filters),
    recipeCountries(),
  ]);

  const withParam = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      tag: filters.tag,
      diet: filters.diet,
      country: filters.country,
      q: filters.q,
      sort: filters.sort === "newest" ? undefined : filters.sort,
      ...patch,
    })) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/recipes?${query}` : "/recipes";
  };

  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">The collection</p>
        <h1 className="display mt-3 text-[clamp(2.6rem,5.6vw,4rem)]">
          Every recipe, weighed.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-moss">
          {formatNumber(total, 0)} recipes from real kitchens. Fibre and protein
          are computed per serving from USDA data, so the filters mean something.
        </p>
      </header>

      <div className="mt-9 flex flex-wrap gap-1.5 sm:gap-2">
        {TAGS.map((tag) => {
          const active = (filters.tag ?? "") === tag.value;
          return (
            <Link
              key={tag.value || "all"}
              href={withParam({ tag: tag.value || undefined, page: undefined })}
              className={cn(
                "rounded-full border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors sm:px-4 sm:tracking-[0.1em]",
                active
                  ? "border-forest bg-forest text-paper"
                  : "border-line-strong text-moss hover:border-forest hover:text-forest",
              )}
            >
              {tag.label}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        action="/recipes"
        className="mt-6 grid grid-cols-2 gap-3 border-y border-line py-5 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]"
      >
        <input type="hidden" name="tag" value={filters.tag ?? ""} />
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="q" className="eyebrow mb-1.5 block">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Lentils, dal, traybake…"
            className="h-11 sm:h-10"
          />
        </div>

        <div>
          <label htmlFor="diet" className="eyebrow mb-1.5 block">
            Diet
          </label>
          <Select
            id="diet"
            name="diet"
            defaultValue={filters.diet ?? ""}
            className="h-11 min-w-0 sm:h-10 lg:min-w-40"
          >
            <option value="">Any diet</option>
            {DIET_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {TAG_LABELS[tag]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="country" className="eyebrow mb-1.5 block">
            Country
          </label>
          <Select
            id="country"
            name="country"
            defaultValue={filters.country ?? ""}
            className="h-11 min-w-0 sm:h-10 lg:min-w-40"
          >
            <option value="">Anywhere</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <div className="flex-1">
            <label htmlFor="sort" className="eyebrow mb-1.5 block">
              Sort
            </label>
            <Select
              id="sort"
              name="sort"
              defaultValue={filters.sort ?? "newest"}
              className="h-11 min-w-0 sm:h-10 lg:min-w-32"
            >
              <option value="newest">Newest</option>
              <option value="fiber">Most fibre</option>
              <option value="protein">Most protein</option>
            </Select>
          </div>
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-10")}
          >
            Apply
          </button>
        </div>
      </form>

      {recipes.length ? (
        <>
          <div className="mt-10 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                priority={index < 3}
              />
            ))}
          </div>

          <nav
            aria-label="Pagination"
            className="mt-14 flex items-center justify-between border-t border-line pt-6"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-moss">
              Page {page} of {pageCount} · {formatNumber(total, 0)} recipes
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={withParam({ page: `${page - 1}` })}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  ← Previous
                </Link>
              ) : null}
              {hasMore ? (
                <Link
                  href={withParam({ page: `${page + 1}` })}
                  className={buttonVariants({ size: "sm" })}
                >
                  Next {PAGE_SIZE} →
                </Link>
              ) : null}
            </div>
          </nav>
        </>
      ) : (
        <div className="mt-14 border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="display text-3xl">Nothing matches that yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-moss">
            Try clearing a filter, or be the recipe that fills this gap.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/recipes"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Clear filters
            </Link>
            <Link href="/submit" className={buttonVariants({ size: "sm" })}>
              Submit a recipe
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

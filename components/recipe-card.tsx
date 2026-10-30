import Link from "next/link";

import { RecipeCover } from "@/components/recipe-cover";
import { TAG_LABELS } from "@/lib/site";
import type { RecipeListItem } from "@/lib/queries/recipes";
import { cn, formatMinutes } from "@/lib/utils";

export function RecipeCard({
  recipe,
  className,
  priority,
}: {
  recipe: RecipeListItem;
  className?: string;
  priority?: boolean;
}) {
  const badges = recipe.tags.filter((tag) =>
    ["high_fiber", "high_protein", "both"].includes(tag),
  );

  return (
    <article className={cn("group flex flex-col", className)}>
      <Link
        href={`/recipes/${recipe.slug}`}
        className="relative block aspect-[4/5] overflow-hidden border border-line"
      >
        <RecipeCover
          recipe={recipe}
          priority={priority}
          className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {badges.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-forest/20 bg-lime-soft/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-forest"
            >
              {TAG_LABELS[tag]}
            </span>
          ))}
          {recipe.tags.includes("vegan") ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-moss">
              Vegan
            </span>
          ) : null}
        </div>

        <h3 className="mt-2.5">
          <Link
            href={`/recipes/${recipe.slug}`}
            className="display text-[1.55rem] leading-tight decoration-line-strong decoration-1 underline-offset-4 hover:underline"
          >
            {recipe.title}
          </Link>
        </h3>

        {recipe.summary ? (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-moss">
            {recipe.summary}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-moss">
          <span className="truncate">{recipe.authorName}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{recipe.authorCountryName}</span>
          <span aria-hidden="true">·</span>
          <span>{formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}</span>
        </div>
      </div>
    </article>
  );
}

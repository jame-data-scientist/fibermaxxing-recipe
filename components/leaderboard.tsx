import Link from "next/link";

import type {
  CountryStanding,
  LeaderboardMetric,
  RecipeListItem,
} from "@/lib/queries/recipes";
import { cn, formatNumber } from "@/lib/utils";

function rank(index: number) {
  return String(index + 1).padStart(2, "0");
}

const EMPTY_COPY: Record<LeaderboardMetric, string> = {
  fiber: "No published recipes yet. The board fills as recipes are approved.",
  protein: "No published recipes yet. The board fills as recipes are approved.",
  both: "Nothing has cleared both bars yet — 8 g fibre and 25 g protein per serving.",
};

export function CountryStandings({ rows }: { rows: CountryStanding[] }) {
  if (!rows.length) {
    return (
      <p className="border-t border-line py-8 text-[13px] leading-relaxed text-moss">
        No countries on the board yet — the first published recipe opens it.
      </p>
    );
  }

  const top = Math.max(...rows.map((row) => row.count), 1);

  return (
    <ol>
      {rows.map((row, index) => (
        <li key={`${row.code}-${row.name}`} className="border-t border-line">
          <Link
            href={`/recipes?country=${row.code}`}
            className="group relative flex items-center gap-3 py-3.5 pl-1.5 pr-2 transition-colors hover:bg-paper-deep/50"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-0 bg-lime-soft/50"
              style={{ width: `${Math.max(6, (row.count / top) * 100)}%` }}
            />
            <span className="relative w-6 shrink-0 font-mono text-[11px] tabular-nums text-moss">
              {rank(index)}
            </span>
            <span className="relative min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
              {row.name}
            </span>
            <span className="relative hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-moss sm:inline">
              {row.code}
            </span>
            <span className="relative w-8 shrink-0 text-right font-mono text-[16px] tabular-nums text-forest">
              {formatNumber(row.count, 0)}
            </span>
            <span className="sr-only">published recipes</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function RecipeStandings({
  metric,
  recipes,
}: {
  metric: LeaderboardMetric;
  recipes: RecipeListItem[];
}) {
  if (!recipes.length) {
    return (
      <p className="mt-6 border-t border-line py-8 text-[13px] leading-relaxed text-moss">
        {EMPTY_COPY[metric]}
      </p>
    );
  }

  return (
    <ol className="mt-6 border-t border-line">
      {recipes.map((recipe, index) => {
        const value =
          metric === "fiber"
            ? recipe.fiberG
            : metric === "protein"
              ? recipe.proteinG
              : recipe.fiberG + recipe.proteinG;

        const unit =
          metric === "fiber"
            ? "g fibre"
            : metric === "protein"
              ? "g protein"
              : "g total";

        return (
          <li
            key={recipe.id}
            className="border-b border-line"
          >
            <Link
              href={`/recipes/${recipe.slug}`}
              className="group flex items-baseline gap-3 py-3.5 pl-1.5 pr-2 transition-colors hover:bg-paper-deep/50"
            >
              <span
                className={cn(
                  "w-6 shrink-0 font-mono text-[11px] tabular-nums",
                  index === 0 ? "text-forest" : "text-moss",
                )}
              >
                {rank(index)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="display block text-[1.15rem] leading-snug underline-offset-4 group-hover:underline">
                  {recipe.title}
                </span>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-moss">
                  {recipe.authorCountryName}
                  {metric === "both" ? (
                    <>
                      {" · "}
                      {formatNumber(recipe.fiberG)}g fibre +{" "}
                      {formatNumber(recipe.proteinG)}g protein
                    </>
                  ) : null}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-[17px] tabular-nums tracking-tight text-forest">
                  {formatNumber(value)}
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-moss">
                  {unit}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

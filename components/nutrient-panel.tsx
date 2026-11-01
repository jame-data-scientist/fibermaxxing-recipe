"use client";

import { useState } from "react";

import { formatNutrientValue } from "@/lib/nutrition/format";
import type { RecipePanel } from "@/lib/nutrition/panel";
import { cn, formatNumber } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  kcal: "kcal",
  kj: "kJ",
  g: "g",
  mg: "mg",
  mcg: "µg",
  iu: "IU",
  ml: "mL",
};

type Basis = "serving" | "100g";

/**
 * Everything stored for the recipe, not only the five headline macros.
 * Groups collapse so the page stays scannable; the first is open on load.
 * The basis toggle switches between the plate and the pantry: per serving, or
 * per 100 g of the finished dish (which needs the cook's serving weight).
 */
export function NutrientPanel({
  panel,
  perHundredPanel,
  servingNote,
  servingGrams,
  embedded = false,
  className,
}: {
  panel: RecipePanel;
  /** Values per 100 g of the finished dish, when a serving weight is known. */
  perHundredPanel?: RecipePanel | null;
  servingNote?: string | null;
  servingGrams?: number | null;
  /** Sit inside an existing page section instead of being one. */
  embedded?: boolean;
  className?: string;
}) {
  const [basis, setBasis] = useState<Basis>("serving");

  if (!panel.groups.length) return null;

  const perHundred = basis === "100g" ? perHundredPanel : null;
  const active = perHundred ?? panel;
  const servingWeight =
    servingGrams && servingGrams > 0 ? formatNumber(servingGrams, 0) : null;

  const description = perHundred
    ? `Per 100 g of the finished dish${
        servingWeight ? ` (one serving is about ${servingWeight} g)` : ""
      }.`
    : `Per serving${servingNote ? ` (${servingNote})` : ""}.`;

  return (
    <section
      id="full-nutrition"
      aria-labelledby="full-nutrition-title"
      className={cn(
        embedded
          ? "mt-6 border-t border-line pt-6"
          : "container-page mt-16 scroll-mt-24 border-t border-line pt-10",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Full nutrition</p>
          <h2
            id="full-nutrition-title"
            className={cn(
              "display mt-2",
              embedded
                ? "text-2xl"
                : "text-[clamp(1.8rem,3.4vw,2.5rem)]",
            )}
          >
            Every nutrient on record
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-moss">
            {description} Summed by weight from the USDA panel stored for each
            matched ingredient. Nutrients with no published value are left out;
            a zero is a published zero.
          </p>
          {panel.matched < panel.counted ? (
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-rust">
              {panel.counted - panel.matched} ingredient
              {panel.counted - panel.matched === 1 ? " has" : "s have"} no
              stored panel, so their nutrients are not included in these
              totals.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          {perHundredPanel ? (
            <div
              role="group"
              aria-label="Show nutrients per serving or per 100 g"
              className="inline-flex border border-line bg-paper-deep/40 p-0.5"
            >
              {(
                [
                  { id: "serving", label: "Per serving" },
                  { id: "100g", label: "Per 100 g" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={basis === option.id}
                  onClick={() => setBasis(option.id)}
                  className={cn(
                    "px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                    basis === option.id
                      ? "bg-forest text-paper"
                      : "text-moss hover:text-forest",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <dl className="flex divide-x divide-line border border-line bg-paper-deep/40">
            <div className="px-4 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-moss">
                Nutrients
              </dt>
              <dd className="mt-1 font-mono text-[15px] tabular-nums text-ink">
                {panel.count}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-moss">
                Ingredients
              </dt>
              <dd className="mt-1 font-mono text-[15px] tabular-nums text-ink">
                {panel.matched}/{panel.counted}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div
        className={cn(
          "grid items-start gap-3 lg:grid-cols-2",
          embedded ? "mt-5" : "mt-8",
        )}
      >
        {active.groups.map((group, index) => (
          <details
            key={group.id}
            open={index === 0}
            className="group border border-line bg-paper-deep/30 open:bg-paper"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-[14px] font-medium text-ink">
                  {group.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-moss">
                  {group.description}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 pt-0.5 font-mono text-[10px] tabular-nums text-moss">
                {group.rows.length}
                <span
                  aria-hidden="true"
                  className="text-[14px] leading-none text-forest group-open:hidden"
                >
                  +
                </span>
                <span
                  aria-hidden="true"
                  className="hidden text-[14px] leading-none text-forest group-open:inline"
                >
                  −
                </span>
              </span>
            </summary>

            <div className="border-t border-line px-4 pb-2">
              <table className="w-full border-collapse text-[12.5px]">
                <tbody>
                  {group.rows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-line/70 last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="py-1.5 pr-4 text-left font-normal leading-snug text-moss"
                      >
                        {row.label}
                      </th>
                      <td className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums text-ink">
                        {formatNutrientValue(row.value)}
                        <span className="ml-1 text-[10px] text-moss">
                          {UNIT_LABELS[row.unit] ?? row.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

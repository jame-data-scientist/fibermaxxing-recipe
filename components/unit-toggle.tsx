"use client";

import { useState } from "react";

import {
  formatQuantity,
  isUnitId,
  type UnitSystem,
} from "@/lib/nutrition/units";
import { cn } from "@/lib/utils";

interface DisplayIngredient {
  id: string;
  position: number;
  amount: number;
  unit: string;
  note: string | null;
  grams: number | null;
  foodName: string | null;
  foodDescription: string | null;
  cupGrams: number | null;
}

export function UnitToggle({
  ingredients,
}: {
  ingredients: DisplayIngredient[];
}) {
  const [system, setSystem] = useState<UnitSystem>("metric");

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <p className="eyebrow">Ingredients</p>
        <div
          className="flex rounded-full border border-line p-0.5"
          role="group"
          aria-label="Ingredient units"
        >
          {(["metric", "imperial"] as UnitSystem[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSystem(option)}
              aria-pressed={system === option}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-3.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors sm:h-7 sm:px-3",
                system === option
                  ? "bg-forest text-paper"
                  : "text-moss hover:text-ink",
              )}
            >
              {option === "metric" ? "Metric" : "Cups / oz"}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line/70">
        {ingredients.map((ingredient) => {
          const unit = isUnitId(ingredient.unit) ? ingredient.unit : null;
          const quantity = unit
            ? formatQuantity(
                ingredient.amount,
                unit,
                system,
                ingredient.cupGrams,
              )
            : `${ingredient.amount} ${ingredient.unit}`;
          const name = ingredient.foodName ?? ingredient.foodDescription ?? "";

          return (
            <li key={ingredient.id} className="flex gap-4 py-3">
              <span
                className="w-24 shrink-0 font-mono text-[12px] tabular-nums text-forest sm:w-28"
                title={
                  ingredient.grams ? `${ingredient.grams} g measured` : undefined
                }
              >
                {quantity}
              </span>
              <span className="text-[14px] leading-relaxed text-ink">
                {name}
                {ingredient.note ? (
                  <span className="text-moss"> · {ingredient.note}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

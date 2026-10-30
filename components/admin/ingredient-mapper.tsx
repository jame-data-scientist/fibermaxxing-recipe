"use client";

import { useState } from "react";

import { mapAllIngredients, mapIngredient } from "@/app/actions/admin";
import { FoodPicker } from "@/components/food-picker";
import type { FoodOption } from "@/lib/foods";

const button =
  "rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors disabled:opacity-40";

export function IngredientMapper({
  ingredientId,
  placeholder,
}: {
  ingredientId: string;
  placeholder: string;
}) {
  const [food, setFood] = useState<FoodOption | null>(null);

  return (
    <form action={mapIngredient} className="contents">
      <input type="hidden" name="ingredientId" value={ingredientId} />
      <input type="hidden" name="fdcId" value={food?.fdcId ?? ""} />
      <div className="min-w-0 flex-1">
        <FoodPicker onSelect={setFood} placeholder={placeholder} />
        {food ? (
          <p className="mt-1 truncate font-mono text-[10px] text-forest">
            → {food.commonName ?? food.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          name="mode"
          value="map"
          disabled={!food}
          className={`${button} border-forest text-forest hover:bg-forest hover:text-paper`}
        >
          Map
        </button>
        <button
          name="mode"
          value="negligible"
          className={`${button} border-line-strong text-moss hover:border-ink hover:text-ink`}
        >
          Negligible
        </button>
      </div>
    </form>
  );
}

export function MapAllForm({
  rawText,
  uses,
}: {
  rawText: string;
  uses: number;
}) {
  const [food, setFood] = useState<FoodOption | null>(null);

  return (
    <form
      action={mapAllIngredients}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="rawText" value={rawText} />
      <input type="hidden" name="fdcId" value={food?.fdcId ?? ""} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">{rawText}</p>
        <p className="font-mono text-[10px] text-moss">
          used {uses}×
          {food ? ` → ${food.commonName ?? food.description}` : ""}
        </p>
      </div>
      <div className="w-full sm:w-64">
        <FoodPicker onSelect={setFood} placeholder="Find the food…" />
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          name="mode"
          value="map"
          disabled={!food}
          className={`${button} border-forest text-forest hover:bg-forest hover:text-paper`}
        >
          Map all
        </button>
        <button
          name="mode"
          value="negligible"
          className={`${button} border-line-strong text-moss hover:border-ink hover:text-ink`}
        >
          Negligible
        </button>
      </div>
    </form>
  );
}

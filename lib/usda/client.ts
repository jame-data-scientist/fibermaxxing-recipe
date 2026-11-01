import {
  buildNutrientPanel,
  type UsdaNutrientMeta,
} from "@/lib/nutrition/nutrients";
import { parsePortionUnit, type UnitId } from "@/lib/nutrition/units";

/**
 * Runtime lookup for foods that are not in the local catalog yet. The catalog
 * is seeded from the USDA CSV dumps, so this is only the growth path — and it
 * is skipped entirely when no FDC_API_KEY is configured.
 */

export interface LivePortion {
  label: string;
  amount: number;
  unit: UnitId;
  gramWeight: number;
}

export interface LiveFood {
  fdcId: string;
  description: string;
  dataType: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  /** Canonical key -> amount per 100 g, built from every nutrient returned. */
  nutrients: Record<string, number>;
  portions: LivePortion[];
}

interface UsdaSearchResponse {
  foods?: {
    fdcId: number;
    description: string;
    dataType?: string;
    foodNutrients?: {
      nutrientId?: number;
      nutrientNumber?: string;
      nutrientName?: string;
      unitName?: string;
      value?: number;
    }[];
    foodPortions?: {
      amount?: number;
      gramWeight?: number;
      portionDescription?: string;
      modifier?: string;
      measureUnit?: { name?: string };
    }[];
  }[];
}

export async function usdaSearch(query: string): Promise<LiveFood[]> {
  const key = process.env.FDC_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("dataType", "Foundation,SR Legacy");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as UsdaSearchResponse;

    return (data.foods ?? [])
      .map((food) => {
        const raw = new Map<string, number>();
        const meta = new Map<string, UsdaNutrientMeta>();
        for (const nutrient of food.foodNutrients ?? []) {
          if (
            nutrient.nutrientId == null ||
            typeof nutrient.value !== "number"
          ) {
            continue;
          }
          const id = String(nutrient.nutrientId);
          if (!raw.has(id)) raw.set(id, nutrient.value);
          if (nutrient.nutrientName && !meta.has(id)) {
            meta.set(id, {
              name: nutrient.nutrientName,
              unit: nutrient.unitName ?? "",
            });
          }
        }
        const panel = buildNutrientPanel(raw, meta);

        const portions: LivePortion[] = [];
        for (const portion of food.foodPortions ?? []) {
          const unit = parsePortionUnit(
            portion.measureUnit?.name,
            portion.portionDescription,
            portion.modifier,
          );
          if (!unit || !portion.gramWeight || portion.gramWeight <= 0) continue;
          portions.push({
            label: `${portion.amount ?? 1} ${unit}`,
            amount: portion.amount ?? 1,
            unit,
            gramWeight: portion.gramWeight,
          });
        }

        return {
          fdcId: String(food.fdcId),
          description: food.description,
          dataType: food.dataType === "Foundation" ? "foundation_food" : "sr_legacy_food",
          kcal: panel.values.kcal ?? null,
          proteinG: panel.values.protein_g ?? null,
          carbsG: panel.values.carbs_g ?? null,
          fatG: panel.values.fat_g ?? null,
          fiberG: panel.values.fiber_g ?? null,
          sugarG: panel.values.sugars_g ?? null,
          sodiumMg: panel.values.sodium_mg ?? null,
          nutrients: panel.values,
          portions,
        } satisfies LiveFood;
      })
      .filter((food) => food.kcal != null || food.proteinG != null);
  } catch {
    return [];
  }
}

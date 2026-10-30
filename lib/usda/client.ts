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
  portions: LivePortion[];
}

const NUTRIENT_KEYS: Record<number, keyof Omit<LiveFood, "fdcId" | "description" | "dataType" | "portions">> = {
  1008: "kcal",
  2048: "kcal",
  2047: "kcal",
  1003: "proteinG",
  1004: "fatG",
  1005: "carbsG",
  1079: "fiberG",
  2000: "sugarG",
  1093: "sodiumMg",
};

interface UsdaSearchResponse {
  foods?: {
    fdcId: number;
    description: string;
    dataType?: string;
    foodNutrients?: { nutrientId?: number; nutrientNumber?: string; value?: number }[];
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
        const values: Record<string, number | null> = {};
        for (const nutrient of food.foodNutrients ?? []) {
          const key =
            nutrient.nutrientId != null
              ? NUTRIENT_KEYS[nutrient.nutrientId]
              : undefined;
          if (key && values[key] == null && typeof nutrient.value === "number") {
            values[key] = nutrient.value;
          }
        }

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
          kcal: values.kcal ?? null,
          proteinG: values.proteinG ?? null,
          carbsG: values.carbsG ?? null,
          fatG: values.fatG ?? null,
          fiberG: values.fiberG ?? null,
          sugarG: values.sugarG ?? null,
          sodiumMg: values.sodiumMg ?? null,
          portions,
        } satisfies LiveFood;
      })
      .filter((food) => food.kcal != null || food.proteinG != null);
  } catch {
    return [];
  }
}

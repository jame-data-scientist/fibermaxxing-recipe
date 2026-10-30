import type { PortionLike } from "@/lib/nutrition/units";

export interface FoodPortionOption extends PortionLike {
  label: string;
}

export interface FoodOption {
  fdcId: string;
  description: string;
  commonName: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  portions: FoodPortionOption[];
}

export function foodLabel(food: Pick<FoodOption, "commonName" | "description">) {
  return food.commonName ?? food.description;
}

export function foodShortDescription(food: FoodOption) {
  return food.commonName ? food.description : "";
}

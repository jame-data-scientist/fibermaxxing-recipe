import { describe, expect, it } from "vitest";

import {
  computeNutrition,
  deriveNutritionTags,
  perHundredGrams,
  type ComputedRow,
  type FoodNutrients,
} from "./compute";

const chicken: FoodNutrients = {
  kcal: 165,
  proteinG: 31.02,
  carbsG: 0,
  fatG: 3.57,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 74,
};

const lentils: FoodNutrients = {
  kcal: 116,
  proteinG: 9.02,
  carbsG: 20.13,
  fatG: 0.38,
  fiberG: 7.9,
  sugarG: 1.8,
  sodiumMg: 2,
};

describe("computeNutrition", () => {
  it("sums by weight and divides by servings", () => {
    const rows: ComputedRow[] = [
      { grams: 200, food: chicken, mappingStatus: "mapped" },
      { grams: 198, food: lentils, mappingStatus: "mapped" },
    ];
    const result = computeNutrition(rows, 2);

    expect(result.total.proteinG).toBe(79.9); // 62.04 + 17.86
    expect(result.perServing.proteinG).toBe(39.95);
    expect(result.total.fiberG).toBe(15.64);
    expect(result.perServing.fiberG).toBe(7.82);
    expect(result.confidence).toBe("computed");
    expect(result.missing).toBe(0);
  });

  it("marks the result incomplete when an ingredient has no food", () => {
    const result = computeNutrition(
      [
        { grams: 200, food: chicken, mappingStatus: "mapped" },
        { grams: 50, food: null, mappingStatus: "unmapped" },
      ],
      2,
    );
    expect(result.confidence).toBe("incomplete");
    expect(result.missing).toBe(1);
    // The known ingredient still contributes; we never silently zero the list.
    expect(result.perServing.proteinG).toBe(31.02);
  });

  it("marks incomplete when a weight could not be resolved", () => {
    const result = computeNutrition(
      [{ grams: null, food: chicken, mappingStatus: "mapped" }],
      1,
    );
    expect(result.confidence).toBe("incomplete");
  });

  it("counts negligible ingredients as mapped but adds nothing", () => {
    const result = computeNutrition(
      [
        { grams: 200, food: chicken, mappingStatus: "mapped" },
        { grams: null, food: null, mappingStatus: "negligible" },
      ],
      1,
    );
    expect(result.confidence).toBe("computed");
    expect(result.missing).toBe(0);
    expect(result.mapped).toBe(2);
    // 200 g at 74 mg/100 g, one serving.
    expect(result.perServing.sodiumMg).toBe(148);
  });

  it("treats a zero or negative serving count as one", () => {
    const result = computeNutrition(
      [{ grams: 200, food: chicken, mappingStatus: "mapped" }],
      0,
    );
    expect(result.perServing.proteinG).toBe(62.04);
  });

  it("ignores nutrients USDA did not publish instead of failing", () => {
    const partial: FoodNutrients = {
      kcal: null,
      proteinG: null,
      carbsG: 10,
      fatG: null,
      fiberG: null,
      sugarG: null,
      sodiumMg: null,
    };
    const result = computeNutrition(
      [{ grams: 100, food: partial, mappingStatus: "mapped" }],
      1,
    );
    expect(result.perServing.carbsG).toBe(10);
    expect(result.perServing.kcal).toBe(0);
    expect(result.confidence).toBe("computed");
  });
});

describe("deriveNutritionTags", () => {
  const base = {
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
  };

  it("uses the app's thresholds", () => {
    expect(deriveNutritionTags({ ...base, fiberG: 7.99 })).toEqual([]);
    expect(deriveNutritionTags({ ...base, fiberG: 8 })).toEqual(["high_fiber"]);
    expect(deriveNutritionTags({ ...base, proteinG: 25 })).toEqual([
      "high_protein",
    ]);
  });

  it("tags a recipe that clears both", () => {
    expect(
      deriveNutritionTags({ ...base, fiberG: 14, proteinG: 31 }),
    ).toEqual(["high_fiber", "high_protein", "both"]);
  });
});

describe("perHundredGrams", () => {
  it("scales a per-serving value by the serving weight", () => {
    const per100 = perHundredGrams(
      {
        kcal: 400,
        proteinG: 30,
        carbsG: 40,
        fatG: 10,
        fiberG: 12,
        sugarG: 4,
        sodiumMg: 200,
      },
      250,
    );
    expect(per100?.fiberG).toBe(4.8);
    expect(per100?.kcal).toBe(160);
  });

  it("returns null without a serving weight", () => {
    const perServing = {
      kcal: 400,
      proteinG: 30,
      carbsG: 40,
      fatG: 10,
      fiberG: 12,
      sugarG: 4,
      sodiumMg: 200,
    };
    expect(perHundredGrams(perServing, null)).toBeNull();
    expect(perHundredGrams(perServing, 0)).toBeNull();
  });
});

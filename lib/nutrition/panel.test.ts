import { describe, expect, it } from "vitest";

import { formatNutrientValue } from "./format";
import {
  computeRecipePanel,
  groupPanel,
  parsePanel,
  scalePanel,
} from "./panel";

describe("computeRecipePanel", () => {
  it("sums per-100 g panels by weight and divides by servings", () => {
    const panel = computeRecipePanel(
      [
        {
          grams: 200,
          mappingStatus: "mapped",
          nutrients: { kcal: 100, protein_g: 10, calcium_mg: 50 },
        },
        {
          grams: 100,
          mappingStatus: "mapped",
          nutrients: { kcal: 50, fiber_g: 5, calcium_mg: 100 },
        },
      ],
      2,
    );

    expect(panel.values.kcal).toBe(125);
    expect(panel.values.protein_g).toBe(10);
    expect(panel.values.fiber_g).toBe(2.5);
    expect(panel.values.calcium_mg).toBe(100);
    expect(panel.matched).toBe(2);
    expect(panel.counted).toBe(2);
    expect(panel.count).toBeGreaterThan(0);
  });

  it("keeps unmapped ingredients out of the totals but counts coverage", () => {
    const panel = computeRecipePanel(
      [
        {
          grams: 100,
          mappingStatus: "mapped",
          nutrients: { kcal: 80 },
        },
        {
          grams: 10,
          mappingStatus: "negligible",
          nutrients: { sodium_mg: 1000 },
        },
        {
          grams: null,
          mappingStatus: "unmapped",
          nutrients: { kcal: 999 },
        },
      ],
      1,
    );

    expect(panel.values.kcal).toBe(80);
    expect(panel.values.sodium_mg).toBeUndefined();
    expect(panel.matched).toBe(2);
    expect(panel.counted).toBe(3);
  });

  it("falls back to one serving for an invalid serving count", () => {
    const panel = computeRecipePanel(
      [{ grams: 100, nutrients: { kcal: 80 } }],
      0,
    );
    expect(panel.values.kcal).toBe(80);
  });
});

describe("groupPanel", () => {
  it("sorts the stored keys into the nutrition groups", () => {
    const groups = groupPanel({
      kcal: 100,
      fiber_g: 5,
      fat_saturated_g: 1,
      sfa_16_0_g: 0.5,
      vitamin_c_mg: 10,
      folate_mcg: 40,
      iron_mg: 2,
      leucine_mg: 500,
      caffeine_mg: 20,
    });
    const keys = new Map(groups.map((group) => [group.id, group.rows.map((row) => row.key)]));

    expect(keys.get("macros")).toEqual(expect.arrayContaining(["kcal", "fiber_g"]));
    expect(keys.get("fats")).toEqual(
      expect.arrayContaining(["fat_saturated_g", "sfa_16_0_g"]),
    );
    expect(keys.get("vitamins")).toEqual(
      expect.arrayContaining(["vitamin_c_mg", "folate_mcg"]),
    );
    expect(keys.get("minerals")).toEqual(expect.arrayContaining(["iron_mg"]));
    expect(keys.get("amino")).toEqual(expect.arrayContaining(["leucine_mg"]));
    expect(keys.get("other")).toEqual(expect.arrayContaining(["caffeine_mg"]));
  });

  it("puts the headline macro keys before the detail rows", () => {
    const [macros] = groupPanel({ sugars_g: 4, kcal: 120, fiber_g: 3 });
    expect(macros.rows.map((row) => row.key)).toEqual([
      "kcal",
      "fiber_g",
      "sugars_g",
    ]);
  });
});

describe("scalePanel", () => {
  it("rescales per-serving values to 100 g of the dish", () => {
    const panel = computeRecipePanel(
      [{ grams: 400, nutrients: { kcal: 200, fiber_g: 10 } }],
      2,
    );
    expect(panel.values.kcal).toBe(400);

    const scaled = scalePanel(panel, 100 / 400);
    expect(scaled.values.kcal).toBe(100);
    expect(scaled.values.fiber_g).toBe(5);
    expect(scaled.groups).toEqual(groupPanel(scaled.values));
    expect(scaled.matched).toBe(1);
    expect(scaled.counted).toBe(1);
  });

  it("keeps the panel as-is for a non-positive factor", () => {
    const panel = computeRecipePanel(
      [{ grams: 100, nutrients: { kcal: 80 } }],
      1,
    );
    expect(scalePanel(panel, 0)).toBe(panel);
    expect(scalePanel(panel, -1)).toBe(panel);
    expect(scalePanel(panel, Number.NaN)).toBe(panel);
  });
});

describe("parsePanel", () => {
  it("keeps finite numbers and drops everything else", () => {
    expect(
      parsePanel('{"kcal":120,"protein_g":"bad","fiber_g":null,"iron_mg":2.4}'),
    ).toEqual({ kcal: 120, iron_mg: 2.4 });
  });

  it("returns null for missing or malformed panels", () => {
    expect(parsePanel(null)).toBeNull();
    expect(parsePanel("not json")).toBeNull();
    expect(parsePanel("[]")).toBeNull();
  });
});

describe("formatNutrientValue", () => {
  it("uses fewer decimals as the amount grows", () => {
    expect(formatNutrientValue(1250)).toBe("1250");
    expect(formatNutrientValue(12.34)).toBe("12.3");
    expect(formatNutrientValue(2.345)).toBe("2.35");
    expect(formatNutrientValue(0.0456)).toBe("0.0456");
    expect(formatNutrientValue(0)).toBe("0");
  });
});

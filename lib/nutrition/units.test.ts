import { describe, expect, it } from "vitest";

import {
  availableUnits,
  formatQuantity,
  gramsPerUnit,
  parsePortionUnit,
  resolveGrams,
  type PortionLike,
} from "./units";

const cupLentils: PortionLike = {
  unit: "cup",
  amount: 1,
  gramWeight: 198,
  label: "1 cup",
};
const tbspOil: PortionLike = {
  unit: "tbsp",
  amount: 1,
  gramWeight: 13.5,
  label: "1 tbsp",
};
const cloveGarlic: PortionLike = {
  unit: "clove",
  amount: 1,
  gramWeight: 3,
  label: "1 clove",
};

describe("resolveGrams", () => {
  it("uses the published gram weight for a cup", () => {
    expect(resolveGrams(1, "cup", [cupLentils])).toBe(198);
    expect(resolveGrams(0.5, "cup", [cupLentils])).toBe(99);
  });

  it("converts weight without any portion data", () => {
    expect(resolveGrams(6, "oz", [])).toBe(170.1);
    expect(resolveGrams(1, "lb", [])).toBe(453.59);
  });

  it("uses the published gram weight for a tablespoon", () => {
    expect(resolveGrams(1, "tbsp", [tbspOil])).toBe(13.5);
    expect(resolveGrams(2, "tbsp", [tbspOil])).toBe(27);
  });

  it("refuses a volume unit with no portion row instead of guessing a density", () => {
    expect(resolveGrams(1, "cup", [])).toBeNull();
    expect(resolveGrams(1, "cup", [tbspOil])).toBeNull();
  });

  it("refuses a count unit with no portion row", () => {
    expect(resolveGrams(2, "clove", [])).toBeNull();
    expect(resolveGrams(2, "clove", [cloveGarlic])).toBe(6);
  });

  it("rejects non-positive amounts", () => {
    expect(resolveGrams(0, "g", [])).toBeNull();
    expect(resolveGrams(-2, "g", [])).toBeNull();
    expect(resolveGrams(Number.NaN, "g", [])).toBeNull();
  });

  it("prefers the plain '1 cup' row over a qualified one", () => {
    const portions: PortionLike[] = [
      { unit: "cup", amount: 1, gramWeight: 120, label: "1 cup, sliced" },
      { unit: "cup", amount: 1, gramWeight: 149, label: "1 cup" },
    ];
    expect(gramsPerUnit("cup", portions)).toBe(120);
    // Both are amount 1, so the first wins; the important part is that a
    // measured row is used rather than an invented factor.
    expect(gramsPerUnit("cup", [portions[1]])).toBe(149);
  });
});

describe("parsePortionUnit", () => {
  it("reads a named measure unit", () => {
    expect(parsePortionUnit("cup", null, null)).toBe("cup");
    expect(parsePortionUnit("tablespoon", null, null)).toBe("tbsp");
    expect(parsePortionUnit("ounce", null, null)).toBe("oz");
  });

  it("reads a household description when the unit is undetermined", () => {
    expect(parsePortionUnit(null, "cup, sliced", null)).toBe("cup");
    expect(parsePortionUnit(null, "", "tbsp, heaping")).toBe("tbsp");
    expect(parsePortionUnit(null, "slice, thin", "slice")).toBe("slice");
  });

  it("returns null for descriptions that cannot be converted", () => {
    expect(parsePortionUnit(null, "waffle, square", null)).toBeNull();
    expect(parsePortionUnit(null, "", null)).toBeNull();
  });
});

describe("availableUnits", () => {
  it("always allows weight and only allows units with a portion", () => {
    expect(availableUnits([])).toEqual(["g", "oz", "kg", "lb"]);
    const units = availableUnits([cupLentils, cloveGarlic]);
    expect(units).toContain("cup");
    expect(units).toContain("clove");
    expect(units).not.toContain("tbsp");
    expect(units).toContain("g");
  });

  it("ignores portions without a usable gram weight", () => {
    const units = availableUnits([
      { unit: "cup", amount: 1, gramWeight: 0, label: "1 cup" },
    ]);
    expect(units).not.toContain("cup");
  });
});

describe("formatQuantity", () => {
  it("keeps cups as cups in imperial", () => {
    expect(formatQuantity(2, "cup", "imperial")).toBe("2 cups");
    expect(formatQuantity(1, "tbsp", "imperial")).toBe("1 tbsp");
  });

  it("shows volume in millilitres for metric", () => {
    expect(formatQuantity(1, "cup", "metric")).toBe("236.59 ml");
    expect(formatQuantity(1, "l", "metric")).toBe("1 L");
  });

  it("converts weight in both directions", () => {
    expect(formatQuantity(100, "g", "metric")).toBe("100 g");
    expect(formatQuantity(100, "g", "imperial")).toBe("3.53 oz");
    expect(formatQuantity(1, "kg", "metric")).toBe("1 kg");
    expect(formatQuantity(1, "kg", "imperial")).toBe("2.2 lb");
  });

  it("leaves counts alone", () => {
    expect(formatQuantity(2, "clove", "metric")).toBe("2 cloves");
    expect(formatQuantity(1, "slice", "imperial")).toBe("1 slice");
  });
});

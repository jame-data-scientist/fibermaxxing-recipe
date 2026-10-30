import { describe, expect, it } from "vitest";

import { MAX_EDGE, fitWithin } from "./image-client";

describe("fitWithin", () => {
  it("leaves photos that already fit untouched", () => {
    expect(fitWithin(1200, 900)).toEqual({ width: 1200, height: 900, scale: 1 });
  });

  it("scales a landscape photo by its long edge", () => {
    const result = fitWithin(4032, 3024);
    expect(result).toEqual({ width: 1600, height: 1200, scale: 1600 / 4032 });
  });

  it("scales a portrait photo by its long edge", () => {
    const result = fitWithin(3024, 4032);
    expect(result).toEqual({ width: 1200, height: 1600, scale: 1600 / 4032 });
  });

  it("honours a custom edge", () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({ width: 1000, height: 500, scale: 0.25 });
  });

  it("never returns a zero dimension", () => {
    expect(fitWithin(10000, 1)).toEqual({ width: MAX_EDGE, height: 1, scale: MAX_EDGE / 10000 });
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
  });
});

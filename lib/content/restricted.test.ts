import { describe, expect, it } from "vitest";

import {
  findRestrictedContent,
  restrictedProblems,
  restrictedSubmissionMessage,
  type RestrictedText,
} from "./restricted";

function recipe(overrides: Partial<RestrictedText> = {}): RestrictedText {
  return {
    title: "Test bowl",
    summary: "",
    tips: "",
    ingredients: [{ text: "lentils" }, { text: "olive oil" }],
    steps: ["Cook the lentils."],
    ...overrides,
  };
}

const terms = (value: RestrictedText) =>
  findRestrictedContent(value).map((hit) => `${hit.category}:${hit.term}`);

describe("findRestrictedContent", () => {
  it("finds pork in an ingredient and keeps its row number", () => {
    const hits = findRestrictedContent(
      recipe({
        ingredients: [{ text: "lentils" }, { text: "pancetta, diced" }],
      }),
    );
    expect(hits).toEqual([
      { category: "pork", term: "pancetta", field: "ingredient", index: 2 },
    ]);
  });

  it("finds alcohol in a step", () => {
    const hits = findRestrictedContent(
      recipe({ steps: ["Brown the onions.", "Deglaze with white wine."] }),
    );
    expect(hits[0]).toMatchObject({
      category: "alcohol",
      term: "white wine",
      field: "step",
      index: 2,
    });
  });

  it("checks the title, summary and cook's note", () => {
    expect(
      terms(
        recipe({
          title: "Pork belly noodles",
          summary: "A splash of beer keeps it saucy.",
          tips: "Ask the butcher for extra lardo.",
        }),
      ),
    ).toEqual(["pork:pork", "alcohol:beer", "pork:lardo"]);
  });

  it("ignores case, accents and hyphens", () => {
    expect(
      terms(
        recipe({
          ingredients: [
            { text: "PANCETTA" },
            { text: "Chicharrón" },
            { text: "cachaça" },
          ],
        }),
      ),
    ).toEqual(["pork:pancetta", "pork:chicharron", "alcohol:cachaca"]);
  });

  it("does not match words that merely contain a term", () => {
    expect(
      terms(
        recipe({
          title: "Hamburger with graham buns and portobello",
          ingredients: [{ text: "pigeon peas" }, { text: "margarine" }],
          steps: ["Serve with ginger ale."],
        }),
      ),
    ).toEqual([]);
  });

  it("allows non-pork substitutes", () => {
    expect(
      terms(
        recipe({
          ingredients: [
            { text: "turkey bacon" },
            { text: "beef salami" },
            { text: "vegan chorizo" },
            { text: "plant-based pepperoni" },
            { text: "Bacon bits, meatless" },
            { text: "Salami, cooked, beef" },
            { text: "Cheese, port de salut" },
            { text: "Vinegar, red wine" },
            { text: "Soy protein concentrate, produced by alcohol extraction" },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("allows pork-free wording", () => {
    expect(
      terms(
        recipe({
          title: "Pork-free chilli",
          ingredients: [{ text: "beans" }],
          steps: ["This one has no pork and no lard."],
        }),
      ),
    ).toEqual([]);
  });

  it("allows alcohol-free drinks and wine vinegar", () => {
    expect(
      terms(
        recipe({
          ingredients: [
            { text: "non-alcoholic beer" },
            { text: "alcohol-free wine" },
            { text: "red wine vinegar" },
            { text: "sherry vinegar" },
            { text: "0.0% lager" },
            { text: "root beer" },
            { text: "ginger beer" },
            { text: "sugar alcohol" },
            { text: "madeira cake" },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("still flags the drink when the free-from claim is elsewhere", () => {
    expect(
      terms(
        recipe({
          ingredients: [{ text: "white wine" }],
          steps: ["This recipe is alcohol-free once reduced."],
        }),
      ),
    ).toEqual(["alcohol:white wine"]);
  });

  it("flags sake but not the phrase 'for the sake of'", () => {
    expect(
      terms(
        recipe({
          steps: [
            "For the sake of speed, use a blender.",
            "Add 2 tbsp sake and simmer.",
          ],
        }),
      ),
    ).toEqual(["alcohol:sake"]);
  });

  it("flags hard cider but not plain cider", () => {
    expect(terms(recipe({ ingredients: [{ text: "apple cider" }] }))).toEqual(
      [],
    );
    expect(
      terms(recipe({ ingredients: [{ text: "hard cider" }] })),
    ).toEqual(["alcohol:hard cider"]);
  });

  it("reads USDA's meat-first names", () => {
    expect(
      terms(
        recipe({
          ingredients: [
            { text: "Bacon, turkey, unprepared" },
            { text: "Wine, non-alcoholic" },
          ],
        }),
      ),
    ).toEqual([]);

    expect(
      terms(
        recipe({
          ingredients: [
            { text: "Pork, cured, bacon, cooked" },
            { text: "Ham, sliced, restaurant" },
            { text: "Wine, red, table" },
            { text: "Bacon, pork, cooked" },
          ],
        }),
      ),
    ).toEqual([
      "pork:pork",
      "pork:bacon",
      "pork:ham",
      "alcohol:wine",
      "pork:bacon",
      "pork:pork",
    ]);
  });

  it("does not let a following ingredient launder bacon", () => {
    expect(
      terms(recipe({ steps: ["Top with bacon, turkey and cheese."] })),
    ).toEqual(["pork:bacon"]);
  });

  it("reports a repeated term only once per row", () => {
    expect(
      terms(recipe({ ingredients: [{ text: "bacon and more bacon" }] })),
    ).toEqual(["pork:bacon"]);
    expect(
      terms(recipe({ ingredients: [{ text: "bacon" }, { text: "bacon" }] })),
    ).toEqual(["pork:bacon", "pork:bacon"]);
  });
});

describe("restrictedProblems", () => {
  it("summarises each category with locations", () => {
    const hits = findRestrictedContent(
      recipe({
        title: "Bacon and beer stew",
        ingredients: [{ text: "bacon" }, { text: "lager" }],
      }),
    );
    expect(restrictedProblems(hits)).toEqual([
      "Contains pork: “bacon” in the title, “bacon” in ingredient 1",
      "Contains alcohol: “beer” in the title, “lager” in ingredient 2",
    ]);
  });

  it("caps the listed terms", () => {
    const hits = findRestrictedContent(
      recipe({
        ingredients: [
          { text: "bacon" },
          { text: "ham" },
          { text: "lard" },
          { text: "pancetta" },
          { text: "chorizo" },
        ],
      }),
    );
    const [problem] = restrictedProblems(hits);
    expect(problem.endsWith("and 2 more")).toBe(true);
  });

  it("writes the refusal sentence for cooks", () => {
    const hits = findRestrictedContent(
      recipe({ ingredients: [{ text: "guanciale" }, { text: "red wine" }] }),
    );
    expect(restrictedSubmissionMessage(hits)).toBe(
      "This kitchen doesn't publish recipes with pork or alcohol. " +
        "Contains pork: “guanciale” in ingredient 1. " +
        "Contains alcohol: “red wine” in ingredient 2. " +
        "Remove or replace them and submit again.",
    );
  });
});

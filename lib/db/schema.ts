import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * SQLite schema, shared by Cloudflare D1 (production) and the local
 * `node:sqlite` file used in development. Both speak the same SQL, so there is
 * one set of queries and one set of migrations.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/* -------------------------------------------------------------------------- */
/*  Food catalog (USDA FoodData Central)                                      */
/* -------------------------------------------------------------------------- */

export const foods = sqliteTable(
  "foods",
  {
    fdcId: text("fdc_id").primaryKey(),
    description: text("description").notNull(),
    /** Short human name for common ingredients ("Lentils, dry"). */
    commonName: text("common_name"),
    category: text("category"),
    dataType: text("data_type"),
    /** Per 100 g. Null means "not published by USDA" (not zero). */
    kcal: real("kcal"),
    proteinG: real("protein_g"),
    carbsG: real("carbs_g"),
    fatG: real("fat_g"),
    fiberG: real("fiber_g"),
    sugarG: real("sugar_g"),
    sodiumMg: real("sodium_mg"),
    /** Normalised description, searched with LIKE. */
    searchText: text("search_text").notNull(),
    source: text("source").notNull().default("usda"),
    useCount: integer("use_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("foods_search_idx").on(t.searchText),
    index("foods_use_count_idx").on(t.useCount),
  ],
);

export const foodPortions = sqliteTable(
  "food_portions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fdcId: text("fdc_id")
      .notNull()
      .references(() => foods.fdcId, { onDelete: "cascade" }),
    /** What the cook sees: "1 cup, sliced". */
    label: text("label").notNull(),
    amount: real("amount").notNull(),
    /** Canonical unit id from lib/nutrition/units.ts. */
    unit: text("unit").notNull(),
    gramWeight: real("gram_weight").notNull(),
  },
  (t) => [index("food_portions_food_idx").on(t.fdcId)],
);

/* -------------------------------------------------------------------------- */
/*  Recipes                                                                   */
/* -------------------------------------------------------------------------- */

export const recipes = sqliteTable(
  "recipes",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),

    authorName: text("author_name").notNull(),
    authorCountryCode: text("author_country_code").notNull(),
    authorCountryName: text("author_country_name").notNull(),
    authorHandle: text("author_handle"),

    servings: integer("servings").notNull(),
    servingNote: text("serving_note"),
    /** Weight of one serving in grams, when the cook provides it. */
    servingGrams: real("serving_grams"),
    prepMinutes: integer("prep_minutes"),
    cookMinutes: integer("cook_minutes"),
    tips: text("tips"),

    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    imageSha256: text("image_sha256"),
    imageRightsAttestedAt: integer("image_rights_attested_at", {
      mode: "timestamp_ms",
    }),

    termsVersion: text("terms_version").notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    featuredAt: integer("featured_at", { mode: "timestamp_ms" }),
    reviewNote: text("review_note"),

    /** Private status link the cook can revisit. */
    submitterToken: text("submitter_token").notNull(),
    ipHash: text("ip_hash"),
  },
  (t) => [
    uniqueIndex("recipes_slug_idx").on(t.slug),
    uniqueIndex("recipes_token_idx").on(t.submitterToken),
    index("recipes_published_idx").on(t.status, t.publishedAt),
    index("recipes_featured_idx").on(t.featuredAt),
  ],
);

export const recipeNutrition = sqliteTable("recipe_nutrition", {
  recipeId: text("recipe_id")
    .primaryKey()
    .references(() => recipes.id, { onDelete: "cascade" }),
  /** Per serving. */
  kcal: real("kcal").notNull().default(0),
  proteinG: real("protein_g").notNull().default(0),
  carbsG: real("carbs_g").notNull().default(0),
  fatG: real("fat_g").notNull().default(0),
  fiberG: real("fiber_g").notNull().default(0),
  sugarG: real("sugar_g").notNull().default(0),
  sodiumMg: real("sodium_mg").notNull().default(0),
  confidence: text("confidence", {
    enum: ["computed", "admin_corrected", "incomplete"],
  })
    .notNull()
    .default("incomplete"),
  computedAt: integer("computed_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const recipeIngredients = sqliteTable(
  "recipe_ingredients",
  {
    id: id(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** What the cook typed, preserved for display and re-mapping. */
    rawText: text("raw_text").notNull(),
    amount: real("amount").notNull(),
    unit: text("unit").notNull(),
    foodFdcId: text("food_fdc_id").references(() => foods.fdcId, {
      onDelete: "set null",
    }),
    grams: real("grams"),
    note: text("note"),
    mappingStatus: text("mapping_status", {
      enum: ["mapped", "unmapped", "negligible"],
    })
      .notNull()
      .default("unmapped"),
  },
  (t) => [
    index("recipe_ingredients_recipe_idx").on(t.recipeId),
    index("recipe_ingredients_food_idx").on(t.foodFdcId),
    index("recipe_ingredients_status_idx").on(t.mappingStatus),
  ],
);

export const recipeSteps = sqliteTable(
  "recipe_steps",
  {
    id: id(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("recipe_steps_recipe_idx").on(t.recipeId)],
);

export const recipeTags = sqliteTable(
  "recipe_tags",
  {
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.recipeId, t.tag] }),
    index("recipe_tags_tag_idx").on(t.tag),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Trust & safety                                                            */
/* -------------------------------------------------------------------------- */

export const recipeReports = sqliteTable(
  "recipe_reports",
  {
    id: id(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["copyright", "harmful", "spam", "other"],
    }).notNull(),
    note: text("note"),
    createdAt: createdAt(),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    resolutionNote: text("resolution_note"),
  },
  (t) => [index("recipe_reports_recipe_idx").on(t.recipeId)],
);

export const dmcaNotices = sqliteTable(
  "dmca_notices",
  {
    id: id(),
    recipeId: text("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    claimantName: text("claimant_name").notNull(),
    claimantEmail: text("claimant_email").notNull(),
    workDescription: text("work_description").notNull(),
    infringingUrl: text("infringing_url").notNull(),
    goodFaith: integer("good_faith", { mode: "boolean" }).notNull(),
    accuracy: integer("accuracy", { mode: "boolean" }).notNull(),
    signature: text("signature").notNull(),
    status: text("status", {
      enum: ["received", "actioned", "rejected", "countered"],
    })
      .notNull()
      .default("received"),
    notes: text("notes"),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    actionedAt: integer("actioned_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("dmca_notices_recipe_idx").on(t.recipeId)],
);

export const infringementStrikes = sqliteTable(
  "infringement_strikes",
  {
    id: id(),
    ipHash: text("ip_hash"),
    handle: text("handle"),
    recipeId: text("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("infringement_strikes_ip_idx").on(t.ipHash),
    index("infringement_strikes_handle_idx").on(t.handle),
  ],
);

export const submissionEvents = sqliteTable(
  "submission_events",
  {
    id: id(),
    ipHash: text("ip_hash").notNull(),
    kind: text("kind").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("submission_events_ip_idx").on(t.ipHash, t.createdAt)],
);

export const appClicks = sqliteTable(
  "app_clicks",
  {
    id: id(),
    source: text("source").notNull().default("unknown"),
    recipeSlug: text("recipe_slug"),
    createdAt: createdAt(),
  },
  (t) => [index("app_clicks_created_idx").on(t.createdAt)],
);

export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type Nutrition = typeof recipeNutrition.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type FoodPortion = typeof foodPortions.$inferSelect;

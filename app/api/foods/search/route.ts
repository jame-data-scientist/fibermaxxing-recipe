import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { chunk } from "@/lib/chunks";
import { db } from "@/lib/db";
import { foodPortions, foods } from "@/lib/db/schema";
import { usdaSearch, type LiveFood } from "@/lib/usda/client";

export const runtime = "nodejs";

interface FoodResult {
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
  portions: { label: string; amount: number; unit: string; gramWeight: number }[];
}

/// USDA ships several records with the same description (different data types
/// or revisions). Showing the same line twice in the picker reads as a bug, so
/// only the best-ranked copy survives.
function dedupeByDescription(rows: Omit<FoodResult, "portions">[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function withPortions(
  allRows: Omit<FoodResult, "portions">[],
): Promise<FoodResult[]> {
  const rows = dedupeByDescription(allRows);
  if (!rows.length) return [];
  const portions = await db
    .select()
    .from(foodPortions)
    .where(
      inArray(
        foodPortions.fdcId,
        rows.map((row) => row.fdcId),
      ),
    );

  const byFood = new Map<string, FoodResult["portions"]>();
  for (const portion of portions) {
    const list = byFood.get(portion.fdcId) ?? [];
    list.push({
      label: portion.label,
      amount: portion.amount,
      unit: portion.unit,
      gramWeight: portion.gramWeight,
    });
    byFood.set(portion.fdcId, list);
  }

  return rows.map((row) => ({ ...row, portions: byFood.get(row.fdcId) ?? [] }));
}

const baseSelection = {
  fdcId: foods.fdcId,
  description: foods.description,
  commonName: foods.commonName,
  kcal: foods.kcal,
  proteinG: foods.proteinG,
  carbsG: foods.carbsG,
  fatG: foods.fatG,
  fiberG: foods.fiberG,
  sugarG: foods.sugarG,
  sodiumMg: foods.sodiumMg,
};

/**
 * D1 is SQLite, so there is no `to_tsvector`. Every searchable token must
 * appear in either the normalised description or the curated short name, and
 * an exact short-name match sorts first.
 */
async function searchLocal(query: string): Promise<FoodResult[]> {
  const term = query.replace(/[%_]/g, "").trim().toLowerCase();
  if (!term) return [];

  const tokens = term.split(/\s+/).filter(Boolean).slice(0, 4);
  const tokenConditions = tokens.map((token) => {
    const pattern = `%${token}%`;
    return or(
      sql`lower(${foods.searchText}) like ${pattern}`,
      sql`lower(coalesce(${foods.commonName}, '')) like ${pattern}`,
    );
  });

  const ranked = await db
    .select(baseSelection)
    .from(foods)
    .where(and(...tokenConditions))
    .orderBy(
      // A curated short name is the strongest signal: someone typing "tomato"
      // means the raw tomato, not tomato paste or a bacon-and-tomato dressing.
      sql`case
        when lower(${foods.commonName}) = ${term} then 0
        when lower(${foods.commonName}) like ${`${term}%`} then 1
        when lower(${foods.commonName}) like ${`%${term}%`} then 2
        else 3
      end asc`,
      desc(foods.useCount),
      sql`length(${foods.description}) asc`,
    )
    .limit(10);

  return withPortions(ranked);
}

async function persistLive(rows: LiveFood[]) {
  if (!rows.length) return;
  for (const food of rows) {
    await db
      .insert(foods)
      .values({
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        kcal: food.kcal,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        fiberG: food.fiberG,
        sugarG: food.sugarG,
        sodiumMg: food.sodiumMg,
        searchText: food.description
          .toLowerCase()
          .replace(/[()]/g, " ")
          .replace(/,/g, " ")
          .replace(/[^a-z0-9% ]+/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        source: "usda-live",
      })
      .onConflictDoNothing({ target: foods.fdcId });

    if (food.portions.length) {
      const existing = await db
        .select({ id: foodPortions.id })
        .from(foodPortions)
        .where(eq(foodPortions.fdcId, food.fdcId))
        .limit(1);
      if (!existing.length) {
        const rows = food.portions.map((portion) => ({
          fdcId: food.fdcId,
          label: portion.label,
          amount: portion.amount,
          unit: portion.unit,
          gramWeight: portion.gramWeight,
        }));
        for (const batch of chunk(rows, 18)) {
          await db.insert(foodPortions).values(batch);
        }
      }
    }
  }
}

export async function GET(request: Request) {
  const q =
    new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";

  if (!q) {
    const popular = await db
      .select(baseSelection)
      .from(foods)
      .where(sql`${foods.commonName} is not null`)
      .orderBy(desc(foods.useCount), sql`length(${foods.description}) asc`)
      .limit(10);
    return NextResponse.json({ foods: await withPortions(popular) });
  }

  let results = await searchLocal(q);

  // Only pay for the USDA call when the local cache is thin. Everything the
  // API returns is written back into the database, so a repeated search is a
  // pure database read.
  if (results.length < 3) {
    const live = await usdaSearch(q);
    if (live.length) {
      await persistLive(live);
      results = await searchLocal(q);
    }
  }

  return NextResponse.json({ foods: results });
}

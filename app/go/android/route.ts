import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { appClicks } from "@/lib/db/schema";
import { PLAY_STORE_URL } from "@/lib/site";

export const runtime = "nodejs";

/** Counts which surface sends people to the app, then hands them to Play. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = (url.searchParams.get("utm_source") ?? "direct").slice(0, 60);
  const recipe = url.searchParams.get("recipe")?.slice(0, 140) ?? null;

  try {
    await db.insert(appClicks).values({ source, recipeSlug: recipe });
  } catch {
    /* analytics must never block the store link */
  }

  return NextResponse.redirect(PLAY_STORE_URL, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}

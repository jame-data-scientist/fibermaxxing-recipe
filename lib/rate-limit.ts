import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { submissionEvents } from "@/lib/db/schema";

export interface Limit {
  perHour: number;
  perDay: number;
}

export async function countRecent(ipHash: string, kind: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissionEvents)
    .where(
      and(
        eq(submissionEvents.ipHash, ipHash),
        eq(submissionEvents.kind, kind),
        gt(submissionEvents.createdAt, since),
      ),
    );
  return row?.count ?? 0;
}

export async function checkRateLimit(
  ipHash: string,
  kind: string,
  limit: Limit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = Date.now();
  const [hour, day] = await Promise.all([
    countRecent(ipHash, kind, new Date(now - 60 * 60 * 1000)),
    countRecent(ipHash, kind, new Date(now - 24 * 60 * 60 * 1000)),
  ]);

  if (hour >= limit.perHour) {
    return {
      ok: false,
      message: "That is a lot in one hour. Try again a little later.",
    };
  }
  if (day >= limit.perDay) {
    return {
      ok: false,
      message: "You have reached today's limit. Come back tomorrow.",
    };
  }
  return { ok: true };
}

export async function recordEvent(ipHash: string, kind: string) {
  await db.insert(submissionEvents).values({ ipHash, kind });
}

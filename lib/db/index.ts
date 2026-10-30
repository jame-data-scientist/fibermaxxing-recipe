import { mkdirSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/sqlite-proxy";

import { SCHEMA_STATEMENTS } from "./ddl";
import * as schema from "./schema";

/**
 * One SQLite dialect, two backends:
 *
 *  - Cloudflare D1 over its HTTP API when CF_ACCOUNT_ID, CF_D1_DATABASE_ID and
 *    CF_D1_API_TOKEN are set. This is what the deployed Vercel app uses, since
 *    Vercel cannot hold a D1 binding.
 *  - A local `.data/kitchen.db` file through Node's built-in `node:sqlite`
 *    driver for development, so the site runs with no cloud credentials.
 *
 * Both return the same shapes, so every query in the app is shared.
 */

export type QueryMethod = "run" | "all" | "get" | "values";

export interface QueryResult {
  rows: unknown[];
}

export type QueryRunner = (
  sql: string,
  params: unknown[],
  method: QueryMethod,
) => Promise<QueryResult>;

export const d1Configured = Boolean(
  process.env.CF_ACCOUNT_ID &&
    process.env.CF_D1_DATABASE_ID &&
    process.env.CF_D1_API_TOKEN,
);

/* -------------------------------------------------------------------------- */
/*  Local file backend                                                        */
/* -------------------------------------------------------------------------- */

let localHandle: { db: import("node:sqlite").DatabaseSync } | null = null;
let localInit: Promise<void> | null = null;

function localPath() {
  return (
    process.env.LOCAL_DB_PATH ??
    path.join(process.cwd(), ".data", "kitchen.db")
  );
}

async function openLocal() {
  localInit ??= (async () => {
    if (process.env.VERCEL) {
      throw new Error(
        "No database configured. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID and CF_D1_API_TOKEN, then run `npm run db:init`.",
      );
    }

    const { DatabaseSync } = await import("node:sqlite");
    const file = localPath();
    mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("pragma journal_mode = wal");
    db.exec("pragma foreign_keys = on");
    for (const statement of SCHEMA_STATEMENTS) db.exec(statement);
    localHandle = { db };
  })();
  await localInit;
  return localHandle!.db;
}

/**
 * `node:sqlite` returns plain objects; drizzle's proxy driver maps results by
 * column position, so each row is flattened to an array in select order.
 */
async function localRunner(
  sql: string,
  params: unknown[],
  method: QueryMethod,
): Promise<QueryResult> {
  const db = await openLocal();
  const bound = params.map((value) => (value === undefined ? null : value));
  const statement = db.prepare(sql);

  if (method === "run") {
    statement.run(...(bound as never[]));
    return { rows: [] };
  }

  if (method === "get") {
    const row = statement.get(...(bound as never[])) as
      | Record<string, unknown>
      | undefined;
    return { rows: (row ? Object.values(row) : undefined) as unknown[] };
  }

  const rows = statement.all(...(bound as never[])) as Record<string, unknown>[];
  return { rows: rows.map((row) => Object.values(row)) };
}

/* -------------------------------------------------------------------------- */
/*  Cloudflare D1 over HTTP                                                   */
/* -------------------------------------------------------------------------- */

function d1Endpoint() {
  const account = process.env.CF_ACCOUNT_ID;
  const database = process.env.CF_D1_DATABASE_ID;
  return `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`;
}

interface D1Response {
  success: boolean;
  errors?: { code?: number; message?: string }[];
  result?:
    | {
        results?: Record<string, unknown>[];
        success?: boolean;
        meta?: Record<string, unknown>;
      }[]
    | {
        results?: Record<string, unknown>[];
        success?: boolean;
        meta?: Record<string, unknown>;
      };
}

async function d1Runner(
  sql: string,
  params: unknown[],
  method: QueryMethod,
): Promise<QueryResult> {
  const body = JSON.stringify({
    sql,
    params: params.map((value) => (value === undefined ? null : value)),
  });

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(d1Endpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_D1_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      const payload = (await response.json()) as D1Response;

      if (!response.ok || !payload.success) {
        const detail =
          payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ??
          `D1 responded ${response.status}`;
        throw new Error(`D1 query failed: ${detail}`);
      }

      const result = Array.isArray(payload.result)
        ? payload.result[0]
        : payload.result;
      const rows = result?.results ?? [];

      if (method === "run") return { rows: [] };
      if (method === "get") {
        const row = rows[0];
        return { rows: (row ? Object.values(row) : undefined) as unknown[] };
      }
      return { rows: rows.map((row) => Object.values(row)) };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // A malformed query will fail again; only retry transport-level errors.
      if (/D1 query failed:/.test(lastError.message)) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("D1 query failed");
}

/* -------------------------------------------------------------------------- */

const runner: QueryRunner = d1Configured ? d1Runner : localRunner;

export const db = drizzle(runner, { schema });
export const dbBackend = d1Configured ? "d1" : "local";

/** Used by the seed and init scripts to fail early with a useful message. */
export function assertDatabaseConfigured() {
  if (!d1Configured && process.env.VERCEL) {
    throw new Error(
      "No database configured. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID and CF_D1_API_TOKEN in Vercel, then run `npm run db:init`.",
    );
  }
}

export function readSchemaStatements(): string[] {
  return SCHEMA_STATEMENTS;
}

export { schema };
export type Database = typeof db;
export type Schema = typeof schema;

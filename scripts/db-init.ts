/**
 * Creates the schema in whichever database is configured.
 *
 *   npm run db:init
 *
 * With CF_* variables set it creates the tables in Cloudflare D1 over the HTTP
 * API; otherwise it creates the local SQLite file used by `npm run dev`.
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { mkdirSync } from "node:fs";
import path from "node:path";

import { SCHEMA_STATEMENTS } from "../lib/db/ddl";

async function initD1(accountId: string, databaseId: string, token: string) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  for (const statement of SCHEMA_STATEMENTS) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: statement }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      errors?: { message?: string }[];
    };

    if (!response.ok || !payload.success) {
      throw new Error(
        `D1 rejected a statement: ${
          payload.errors?.map((error) => error.message).join("; ") ??
          response.status
        }\n${statement.slice(0, 120)}`,
      );
    }
  }

  console.log(`D1 schema ready (${SCHEMA_STATEMENTS.length} statements).`);
}

async function initLocal() {
  const { DatabaseSync } = await import("node:sqlite");
  const file =
    process.env.LOCAL_DB_PATH ??
    path.join(process.cwd(), ".data", "kitchen.db");

  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("pragma journal_mode = wal");
  db.exec("pragma foreign_keys = on");
  for (const statement of SCHEMA_STATEMENTS) db.exec(statement);
  db.close();

  console.log(`Local SQLite schema ready at ${file}.`);
}

async function main() {
  const accountId = process.env.CF_ACCOUNT_ID?.trim();
  const databaseId = process.env.CF_D1_DATABASE_ID?.trim();
  const token = process.env.CF_D1_API_TOKEN?.trim();

  if (accountId && databaseId && token) {
    await initD1(accountId, databaseId, token);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Refusing to create a local database on Vercel. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID and CF_D1_API_TOKEN.",
    );
  }

  await initLocal();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

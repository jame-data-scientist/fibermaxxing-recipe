/**
 * D1 caps a statement at 100 bound parameters. Multi-row inserts are split so
 * the same code works against local SQLite and Cloudflare D1.
 */
export function chunk<T>(rows: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    batches.push(rows.slice(index, index + size));
  }
  return batches;
}

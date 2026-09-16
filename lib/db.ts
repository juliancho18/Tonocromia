import { Pool, type QueryResultRow } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Small tagged-template helper so call sites read like `sql`select ...``
// (values are still sent as real query parameters, never interpolated into
// the query text) instead of hand-building parameter arrays everywhere.
export async function sql<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  const text = strings.reduce((acc, part, i) => acc + (i === 0 ? "" : `$${i}`) + part, "");
  return pool.query<T>(text, values);
}

sql.query = (text: string) => pool.query(text);

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const schema = readFileSync(join(process.cwd(), "lib/schema.sql"), "utf-8");
      const statements = schema.split(";").map(s => s.trim()).filter(Boolean);
      for (const statement of statements) {
        await pool.query(statement);
      }
    })();
  }
  return schemaReady;
}

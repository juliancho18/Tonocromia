import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const { rows } = await sql`
    select id, label, audio_url, duration_ms
    from fragments where active = true order by order_index asc
  `;
  return NextResponse.json(rows);
}

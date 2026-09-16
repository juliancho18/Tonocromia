import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

interface ResponseInput {
  fragmentId: string;
  colors: { hue: number; saturation: number; lightness: number; hex: string }[];
  emotion: string | null;
  texture: string | null;
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const { alias, responses } = (await req.json()) as { alias: string; responses: ResponseInput[] };

  if (!alias || !responses?.length) {
    return NextResponse.json({ error: "Faltan datos de la entrega." }, { status: 400 });
  }

  const { rows } = await sql<{ id: string }>`
    insert into submissions (alias) values (${alias}) returning id
  `;
  const submissionId = rows[0].id;
  for (const r of responses) {
    await sql`
      insert into responses (submission_id, fragment_id, colors, emotion, texture)
      values (${submissionId}, ${r.fragmentId}, ${JSON.stringify(r.colors)}, ${r.emotion}, ${r.texture})
    `;
  }
  return NextResponse.json({ ok: true, submissionId });
}

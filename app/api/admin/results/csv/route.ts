import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";

interface ColorEntry {
  hex: string;
  hue: number;
  saturation: number;
  lightness: number;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  if (!token || !verifySession(token, process.env.ADMIN_SESSION_SECRET!)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureSchema();
  const { rows } = await sql<{
    alias: string;
    submitted_at: Date;
    fragment_id: string;
    colors: ColorEntry[];
    emotion: string | null;
    texture: string | null;
  }>`
    select s.alias, s.submitted_at, r.fragment_id, r.colors, r.emotion, r.texture
    from submissions s join responses r on r.submission_id = s.id
    order by s.submitted_at desc
  `;

  const header = [
    "apodo", "enviado_en", "fragmento_id", "color_numero", "hex",
    "matiz", "saturacion", "luminosidad", "emocion", "textura",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const colors = row.colors.length ? row.colors : [null];
    colors.forEach((c, i) => {
      lines.push(
        [
          row.alias,
          row.submitted_at.toISOString(),
          row.fragment_id,
          c ? String(i + 1) : "",
          c?.hex ?? "",
          c?.hue ?? "",
          c?.saturation ?? "",
          c?.lightness ?? "",
          row.emotion ?? "",
          row.texture ?? "",
        ].map(csvCell).join(","),
      );
    });
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=tonocromia_resultados.csv",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { sql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { MAX_COLORS } from "@/lib/constants";

interface ColorEntry {
  hex: string;
  hue: number;
  saturation: number;
  lightness: number;
}

// Picks readable text (black/white) for a given hex background, so the hex
// label stays legible whether the swatch color is light or dark.
function contrastFontColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "FF000000";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "FF000000" : "FFFFFFFF";
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
    fragment_label: string | null;
    colors: ColorEntry[];
    emotion: string | null;
    texture: string | null;
  }>`
    select s.alias, s.submitted_at, r.fragment_id, f.label as fragment_label, r.colors, r.emotion, r.texture
    from submissions s
    join responses r on r.submission_id = s.id
    left join fragments f on f.id = r.fragment_id
    order by s.submitted_at desc, s.alias asc
  `;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tonocromía";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Resultados", { views: [{ state: "frozen", ySplit: 1 }] });

  const colorColumns = Array.from({ length: MAX_COLORS }, (_, i) => ({
    header: `Color ${i + 1}`,
    key: `color${i + 1}`,
    width: 12,
  }));

  sheet.columns = [
    { header: "Apodo", key: "alias", width: 18 },
    { header: "Enviado", key: "submittedAt", width: 20 },
    { header: "Fragmento", key: "fragment", width: 22 },
    { header: "Emoción", key: "emotion", width: 16 },
    { header: "Textura", key: "texture", width: 22 },
    ...colorColumns,
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF161616" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (const row of rows) {
    const excelRow = sheet.addRow({
      alias: row.alias,
      submittedAt: row.submitted_at,
      fragment: row.fragment_label ?? row.fragment_id,
      emotion: row.emotion ?? "",
      texture: row.texture ?? "",
    });
    excelRow.getCell("submittedAt").numFmt = "yyyy-mm-dd hh:mm";

    row.colors.slice(0, MAX_COLORS).forEach((c, i) => {
      const cell = excelRow.getCell(`color${i + 1}`);
      cell.value = c.hex;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${c.hex.replace("#", "")}` } };
      cell.font = { color: { argb: contrastFontColor(c.hex) } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 + MAX_COLORS } };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=tonocromia_resultados.xlsx",
    },
  });
}

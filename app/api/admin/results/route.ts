import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  if (!token || !verifySession(token, process.env.ADMIN_SESSION_SECRET!)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureSchema();
  const alias = req.nextUrl.searchParams.get("alias")?.trim() ?? "";
  const { rows } = alias
    ? await sql`
        select s.alias, s.submitted_at, r.fragment_id, f.label as fragment_label, r.colors, r.emotion, r.texture
        from submissions s
        join responses r on r.submission_id = s.id
        left join fragments f on f.id = r.fragment_id
        where s.alias ilike ${`%${alias}%`}
        order by s.submitted_at desc
      `
    : await sql`
        select s.alias, s.submitted_at, r.fragment_id, f.label as fragment_label, r.colors, r.emotion, r.texture
        from submissions s
        join responses r on r.submission_id = s.id
        left join fragments f on f.id = r.fragment_id
        order by s.submitted_at desc
      `;
  return NextResponse.json(rows);
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  if (!token || !verifySession(token, process.env.ADMIN_SESSION_SECRET!)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureSchema();
  const { alias } = await req.json();
  if (!alias || typeof alias !== "string") {
    return NextResponse.json({ error: "Falta el apodo del encuestado." }, { status: 400 });
  }
  // responses.submission_id has ON DELETE CASCADE, so this also removes every
  // response tied to this participant's submission(s).
  await sql`delete from submissions where alias = ${alias}`;
  return NextResponse.json({ ok: true });
}

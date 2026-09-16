import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  if (!token || !verifySession(token, process.env.ADMIN_SESSION_SECRET!)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await ensureSchema();
  const { rows } = await sql`
    select s.alias, s.submitted_at, r.fragment_id, r.colors, r.emotion, r.texture
    from submissions s join responses r on r.submission_id = s.id
    order by s.submitted_at desc
  `;
  return NextResponse.json(rows);
}

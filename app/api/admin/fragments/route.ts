import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { transcodeAndProbe } from "@/lib/audio";
import { wouldExceedLimit } from "@/lib/duration";
import { verifySession } from "@/lib/auth";
import { randomUUID } from "crypto";

// Transcoding a longer fragment can take a while; give the function more
// room than the Next.js/Vercel default before it gets killed mid-upload.
export const maxDuration = 60;

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  return !!token && verifySession(token, process.env.ADMIN_SESSION_SECRET!);
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureSchema();
  const { rows } = await sql`select * from fragments order by order_index asc`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureSchema();

  const { blobUrl, label: rawLabel } = (await req.json()) as { blobUrl?: string; label?: string };
  if (!blobUrl || typeof blobUrl !== "string") {
    return NextResponse.json({ error: "Falta el audio subido." }, { status: 400 });
  }
  const label = String(rawLabel ?? "audio");

  const sourceRes = await fetch(blobUrl);
  if (!sourceRes.ok) {
    return NextResponse.json({ error: "No se pudo leer el audio subido." }, { status: 400 });
  }
  const inputBuffer = Buffer.from(await sourceRes.arrayBuffer());

  let transcoded;
  try {
    transcoded = await transcodeAndProbe(inputBuffer);
  } catch {
    await del(blobUrl).catch(() => {});
    return NextResponse.json(
      { error: "No se pudo procesar el audio. Verifica que el archivo sea un formato de audio válido." },
      { status: 422 },
    );
  }
  const { buffer, durationMs, contentType } = transcoded;

  const { rows: activeRows } = await sql<{ duration_ms: number }>`
    select duration_ms from fragments where active = true
  `;
  if (wouldExceedLimit(activeRows.map(r => r.duration_ms), durationMs)) {
    await del(blobUrl).catch(() => {});
    return NextResponse.json(
      { error: "Este audio superaría el límite de 10 minutos totales activos." },
      { status: 422 },
    );
  }

  const id = randomUUID();
  const blob = await put(`fragments/${id}.aac`, buffer, {
    access: "public",
    contentType,
  });
  await del(blobUrl).catch(() => {});

  const { rows: maxOrder } = await sql<{ m: number }>`select coalesce(max(order_index), -1) as m from fragments`;
  await sql`
    insert into fragments (id, label, audio_url, duration_ms, order_index, active)
    values (${id}, ${label}, ${blob.url}, ${durationMs}, ${maxOrder[0].m + 1}, true)
  `;
  return NextResponse.json({ id, label, audioUrl: blob.url, durationMs });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureSchema();
  const { id, label, active, orderIndex } = await req.json();

  if (active === true) {
    const { rows: activeRows } = await sql<{ duration_ms: number }>`
      select duration_ms from fragments where active = true and id != ${id}
    `;
    const { rows: thisFragment } = await sql<{ duration_ms: number }>`
      select duration_ms from fragments where id = ${id}
    `;
    if (
      thisFragment[0] &&
      wouldExceedLimit(activeRows.map(r => r.duration_ms), thisFragment[0].duration_ms)
    ) {
      return NextResponse.json(
        { error: "Activar este fragmento superaría el límite de 10 minutos totales." },
        { status: 422 },
      );
    }
  }

  if (label !== undefined) await sql`update fragments set label = ${label} where id = ${id}`;
  if (active !== undefined) await sql`update fragments set active = ${active} where id = ${id}`;
  if (orderIndex !== undefined) await sql`update fragments set order_index = ${orderIndex} where id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureSchema();
  const { id } = await req.json();
  const { rows } = await sql<{ audio_url: string | null }>`select audio_url from fragments where id = ${id}`;
  if (rows[0]?.audio_url) await del(rows[0].audio_url);
  await sql`delete from fragments where id = ${id}`;
  return NextResponse.json({ ok: true });
}

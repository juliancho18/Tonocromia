import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { verifySession } from "@/lib/auth";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("tonocromia_admin")?.value;
  return !!token && verifySession(token, process.env.ADMIN_SESSION_SECRET!);
}

// Issues short-lived client tokens so the browser can upload audio fragments
// straight to Vercel Blob, bypassing the ~4.5MB request body limit that
// Vercel serverless functions impose on routes that receive the raw file.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*", "video/*"],
        maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar la subida." },
      { status: 400 },
    );
  }
}

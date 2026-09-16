import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_TTL_MS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = signSession(process.env.ADMIN_SESSION_SECRET!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tonocromia_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}

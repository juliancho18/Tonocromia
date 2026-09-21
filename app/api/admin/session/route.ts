import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions, signSession, verifySession } from "@/lib/auth";

// Heartbeat: while the admin is active the panel calls this to slide the
// inactivity window forward. An expired/invalid session gets 401.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET!;
  if (!token || !verifySession(token, secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, signSession(secret), sessionCookieOptions(SESSION_TTL_MS / 1000));
  return res;
}

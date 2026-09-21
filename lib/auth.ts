import { createHmac, timingSafeEqual } from "crypto";

const PAYLOAD = "tonocromia-admin";

// Sessions must expire server-side, not just via the cookie's own maxAge —
// otherwise a copied cookie value could be replayed forever. This is an
// inactivity window: the panel refreshes the token while the admin is working
// (see /api/admin/session), so it only lapses after this much idle time.
export const SESSION_TTL_MS = 30 * 60 * 1000;

export const SESSION_COOKIE = "tonocromia_admin";

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function signSession(secret: string): string {
  const payload = `${PAYLOAD}.${Date.now()}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifySession(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [prefix, issuedAtRaw, signature] = parts;
  if (prefix !== PAYLOAD) return false;

  const payload = `${prefix}.${issuedAtRaw}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const issuedAt = Number(issuedAtRaw);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < SESSION_TTL_MS && Date.now() >= issuedAt;
}

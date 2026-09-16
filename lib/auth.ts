import { createHmac, timingSafeEqual } from "crypto";

const PAYLOAD = "tonocromia-admin";

export function signSession(secret: string): string {
  const signature = createHmac("sha256", secret).update(PAYLOAD).digest("hex");
  return `${PAYLOAD}.${signature}`;
}

export function verifySession(token: string, secret: string): boolean {
  const [payload, signature] = token.split(".");
  if (payload !== PAYLOAD || !signature) return false;
  const expected = createHmac("sha256", secret).update(PAYLOAD).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

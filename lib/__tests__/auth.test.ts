import { describe, it, expect, vi } from "vitest";
import { signSession, verifySession, SESSION_TTL_MS } from "../auth";

describe("admin session token", () => {
  it("verifies a token it just signed", () => {
    const token = signSession("secret-key");
    expect(verifySession(token, "secret-key")).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession("secret-key");
    expect(verifySession(token, "other-secret")).toBe(false);
  });

  it("rejects a garbage token", () => {
    expect(verifySession("not-a-real-token", "secret-key")).toBe(false);
  });

  it("rejects a token past its TTL, even with a valid signature", () => {
    const token = signSession("secret-key");
    vi.useFakeTimers();
    vi.advanceTimersByTime(SESSION_TTL_MS + 1);
    expect(verifySession(token, "secret-key")).toBe(false);
    vi.useRealTimers();
  });

  it("rejects a replayed token whose timestamp was tampered with", () => {
    const token = signSession("secret-key");
    const [prefix, , signature] = token.split(".");
    const futureTimestamp = Date.now() + SESSION_TTL_MS;
    const tampered = `${prefix}.${futureTimestamp}.${signature}`;
    expect(verifySession(tampered, "secret-key")).toBe(false);
  });
});

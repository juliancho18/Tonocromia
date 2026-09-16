import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../auth";

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
});

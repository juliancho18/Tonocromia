import { describe, it, expect } from "vitest";
import { MAX_TOTAL_DURATION_MS, wouldExceedLimit } from "../duration";

describe("wouldExceedLimit", () => {
  it("allows activating a fragment when the new total stays under 10 minutes", () => {
    const activeDurations = [60_000, 60_000];
    expect(wouldExceedLimit(activeDurations, 5 * 60_000)).toBe(false);
  });

  it("blocks activating a fragment that would push the total over 10 minutes", () => {
    const activeDurations = [9 * 60_000];
    expect(wouldExceedLimit(activeDurations, 2 * 60_000)).toBe(true);
  });

  it("allows landing exactly on the 10 minute limit", () => {
    const activeDurations = [8 * 60_000];
    expect(wouldExceedLimit(activeDurations, 2 * 60_000)).toBe(false);
  });

  it("exposes the 10 minute constant in milliseconds", () => {
    expect(MAX_TOTAL_DURATION_MS).toBe(10 * 60 * 1000);
  });
});

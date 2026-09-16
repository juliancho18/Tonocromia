import { describe, it, expect } from "vitest";
import { hslToHex, fallbackPeaks, WAVE_POINTS } from "../waveform";

describe("hslToHex", () => {
  it("converts pure red", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });

  it("converts pure white regardless of hue", () => {
    expect(hslToHex(180, 0, 100)).toBe("#ffffff");
  });

  it("converts black", () => {
    expect(hslToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("fallbackPeaks", () => {
  it("returns WAVE_POINTS values between 0.22 and 1", () => {
    const peaks = fallbackPeaks(3);
    expect(peaks).toHaveLength(WAVE_POINTS);
    peaks.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0.22);
      expect(p).toBeLessThanOrEqual(1);
    });
  });

  it("is deterministic for the same seed", () => {
    expect(fallbackPeaks(5)).toEqual(fallbackPeaks(5));
  });

  it("differs between seeds", () => {
    expect(fallbackPeaks(1)).not.toEqual(fallbackPeaks(2));
  });
});

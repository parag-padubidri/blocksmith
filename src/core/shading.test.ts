import { describe, expect, it } from "vitest";
import { FACE_SHADE, grain, hexToRgb, shadedFaceColor, srgbToLinear } from "./shading";

describe("grain", () => {
  it("is deterministic: same input, same output", () => {
    for (let i = 0; i < 50; i++) {
      const x = i % 16, y = (i * 7) % 16, z = (i * 3) % 16, f = i % 6;
      expect(grain(x, y, z, f)).toBe(grain(x, y, z, f));
    }
  });

  it("stays within ±0.06", () => {
    for (let x = 0; x < 16; x++)
      for (let f = 0; f < 6; f++) {
        const g = grain(x, 3, 7, f);
        expect(g).toBeGreaterThanOrEqual(-0.06);
        expect(g).toBeLessThanOrEqual(0.06);
      }
  });

  it("varies across faces of the same voxel", () => {
    const values = new Set([0, 1, 2, 3, 4, 5].map((f) => grain(4, 4, 4, f)));
    expect(values.size).toBe(6);
  });
});

describe("srgbToLinear", () => {
  it("matches the standard transfer function", () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1, 10);
    expect(srgbToLinear(0.04045)).toBeCloseTo(0.04045 / 12.92, 10);
    expect(srgbToLinear(0.5)).toBeCloseTo(0.21404, 4);
  });
});

describe("hexToRgb", () => {
  it("parses palette hexes", () => {
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    const [r, g, b] = hexToRgb("#6abe30");
    expect(r).toBeCloseTo(0x6a / 255, 10);
    expect(g).toBeCloseTo(0xbe / 255, 10);
    expect(b).toBeCloseTo(0x30 / 255, 10);
  });
});

describe("shadedFaceColor", () => {
  it("applies the per-face shade table", () => {
    for (let f = 0; f < 6; f++) {
      const [r, g, b] = shadedFaceColor([0.5, 0.6, 0.7], 1, 2, 3, f, false);
      expect(r).toBeCloseTo(Math.min(1, 0.5 * FACE_SHADE[f]), 10);
      expect(g).toBeCloseTo(Math.min(1, 0.6 * FACE_SHADE[f]), 10);
      expect(b).toBeCloseTo(Math.min(1, 0.7 * FACE_SHADE[f]), 10);
    }
  });

  it("clamps at 1", () => {
    const [r] = shadedFaceColor([1, 1, 1], 0, 0, 0, 2, true); // +y shade 1.0 + grain
    expect(r).toBeLessThanOrEqual(1);
  });
});

import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./templates";
import { inBounds, parseKey } from "./voxels";
import { PALETTE } from "./shading";

describe("starter templates", () => {
  it("has the five planned templates", () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      "tree",
      "sword",
      "chest",
      "character",
      "house",
    ]);
  });

  for (const t of TEMPLATES) {
    it(`${t.id}: non-empty, in bounds, valid palette indices`, () => {
      const m = t.build();
      expect(m.size).toBeGreaterThan(0);
      m.forEach((c, k) => {
        const [x, y, z] = parseKey(k);
        expect(inBounds(x, y, z)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(PALETTE.length);
        expect(y).toBeGreaterThanOrEqual(0); // sits on or above ground
      });
    });

    it(`${t.id}: builds are deterministic`, () => {
      const a = t.build();
      const b = t.build();
      expect(a.size).toBe(b.size);
      a.forEach((c, k) => expect(b.get(k)).toBe(c));
    });
  }
});

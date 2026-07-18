import { describe, expect, it } from "vitest";
import { fromJSONText, toJSONText } from "./json";
import { key, type VoxelMap } from "../voxels";
import { PALETTE } from "../shading";

describe("JSON round-trip", () => {
  it("is identity for a valid model", () => {
    const m: VoxelMap = new Map([
      [key(0, 0, 0), 0],
      [key(15, 15, 15), 15],
      [key(3, 7, 9), 8],
    ]);
    const back = fromJSONText(toJSONText(m));
    expect(back).not.toBeNull();
    expect(back!.size).toBe(m.size);
    m.forEach((c, k) => expect(back!.get(k)).toBe(c));
  });
});

describe("lenient import (LLM-generated JSON path)", () => {
  it("skips out-of-bounds voxels instead of rejecting", () => {
    const back = fromJSONText(
      JSON.stringify({ size: 16, voxels: [{ x: 0, y: 0, z: 0, c: 1 }, { x: 99, y: 0, z: 0, c: 1 }, { x: -1, y: 2, z: 3, c: 1 }] })
    );
    expect(back!.size).toBe(1);
    expect(back!.get(key(0, 0, 0))).toBe(1);
  });

  it("clamps invalid color indices", () => {
    const back = fromJSONText(
      JSON.stringify({ size: 16, voxels: [{ x: 1, y: 1, z: 1, c: 999 }, { x: 2, y: 1, z: 1, c: -5 }] })
    );
    expect(back!.get(key(1, 1, 1))).toBe(PALETTE.length - 1);
    expect(back!.get(key(2, 1, 1))).toBe(0);
  });

  it("tolerates junk entries and missing c", () => {
    const back = fromJSONText(
      JSON.stringify({ voxels: [null, "junk", { x: 1, y: 2, z: 3 }, { x: "4", y: "5", z: "6", c: "2" }] })
    );
    expect(back!.get(key(1, 2, 3))).toBe(0);
    expect(back!.get(key(4, 5, 6))).toBe(2); // string coords coerced
  });

  it("floors fractional coordinates", () => {
    const back = fromJSONText(JSON.stringify({ voxels: [{ x: 1.7, y: 2.2, z: 3.9, c: 1 }] }));
    expect(back!.get(key(1, 2, 3))).toBe(1);
  });

  it("tolerates iOS/ChatGPT smart quotes from a paste", () => {
    // Curly quotes (U+201C/U+201D), as substituted by iOS text fields on copy.
    const back = fromJSONText(
      '{“size”:16,“voxels”:[{“x”:8,“y”:0,“z”:5,“c”:4},{“x”:7,“y”:0,“z”:6,“c”:4}]}'
    );
    expect(back).not.toBeNull();
    expect(back!.size).toBe(2);
    expect(back!.get(key(8, 0, 5))).toBe(4);
    expect(back!.get(key(7, 0, 6))).toBe(4);
  });

  it("returns null for garbage input", () => {
    expect(fromJSONText("not json at all")).toBeNull();
    expect(fromJSONText("{}")).toBeNull();
    expect(fromJSONText('{"voxels": []}')).toBeNull();
    expect(fromJSONText('{"voxels": "nope"}')).toBeNull();
    expect(fromJSONText("42")).toBeNull();
  });
});

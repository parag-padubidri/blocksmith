import { describe, expect, it } from "vitest";
import { encodeShare, decodeShare, parseShareHash, shareFragment } from "./urlCodec";
import { key, type VoxelMap } from "./voxels";

function bigModel(count: number): VoxelMap {
  const m: VoxelMap = new Map();
  let i = 0;
  outer: for (let x = 0; x < 16; x++)
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 16; z++) {
        if (i >= count) break outer;
        m.set(key(x, y, z), (x + y + z) % 16);
        i++;
      }
  return m;
}

describe("urlCodec", () => {
  it("round-trips a model exactly", () => {
    const m: VoxelMap = new Map([
      [key(0, 0, 0), 3],
      [key(15, 15, 15), 15],
    ]);
    const back = decodeShare(encodeShare(m));
    expect(back).not.toBeNull();
    expect(back!.size).toBe(2);
    m.forEach((c, k) => expect(back!.get(k)).toBe(c));
  });

  it("round-trips a 500-voxel model via the full hash", () => {
    const m = bigModel(500);
    const frag = shareFragment(m);
    expect(frag.startsWith("#m=")).toBe(true);
    const back = parseShareHash(frag);
    expect(back).not.toBeNull();
    expect(back!.size).toBe(500);
    m.forEach((c, k) => expect(back!.get(k)).toBe(c));
  });

  it("compresses a 500-voxel model to a workable URL length", () => {
    const frag = shareFragment(bigModel(500));
    expect(frag.length).toBeLessThan(4000);
  });

  it("fails gracefully on garbage", () => {
    expect(decodeShare("!!!! not a payload")).toBeNull();
    expect(decodeShare("")).toBeNull();
    expect(parseShareHash("#other=stuff")).toBeNull();
    expect(parseShareHash("")).toBeNull();
    expect(parseShareHash("#m=")).toBeNull();
    expect(parseShareHash("#m=garbagegarbage")).toBeNull();
  });
});

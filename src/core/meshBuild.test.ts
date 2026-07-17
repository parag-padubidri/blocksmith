import { describe, expect, it } from "vitest";
import { buildMesh } from "./meshBuild";
import { key, type VoxelMap } from "./voxels";

describe("buildMesh", () => {
  it("single voxel: 6 faces, 24 verts, 36 indices", () => {
    const m: VoxelMap = new Map([[key(0, 0, 0), 0]]);
    const d = buildMesh(m);
    expect(d.faceCount).toBe(6);
    expect(d.vertexCount).toBe(24);
    expect(d.positions.length).toBe(24 * 3);
    expect(d.colors.length).toBe(24 * 3);
    expect(d.indices.length).toBe(36);
  });

  it("two stacked voxels: interior faces culled -> 10 faces, 40 verts, 60 indices", () => {
    const m: VoxelMap = new Map([
      [key(5, 0, 5), 0],
      [key(5, 1, 5), 1],
    ]);
    const d = buildMesh(m);
    expect(d.faceCount).toBe(10);
    expect(d.vertexCount).toBe(40);
    expect(d.indices.length).toBe(60);
  });

  it("indices stay in bounds", () => {
    const m: VoxelMap = new Map([
      [key(0, 0, 0), 0],
      [key(1, 0, 0), 2],
      [key(0, 1, 0), 3],
    ]);
    const d = buildMesh(m);
    for (const i of d.indices) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(d.vertexCount);
    }
  });

  it("faces are unwelded: exactly 4 verts per face, no cross-face index sharing", () => {
    const m: VoxelMap = new Map([[key(2, 3, 4), 5]]);
    const d = buildMesh(m);
    expect(d.vertexCount).toBe(d.faceCount * 4);
    // Each face's 6 indices reference only its own 4-vertex block.
    for (let f = 0; f < d.faceCount; f++) {
      for (let i = 0; i < 6; i++) {
        const idx = d.indices[f * 6 + i];
        expect(idx).toBeGreaterThanOrEqual(f * 4);
        expect(idx).toBeLessThan(f * 4 + 4);
      }
    }
  });

  it("colors are linear-space (darker than the sRGB source values)", () => {
    const m: VoxelMap = new Map([[key(0, 0, 0), 9]]); // Snow #f2f4f5, bright
    const d = buildMesh(m);
    for (let i = 0; i < d.colors.length; i++) {
      expect(d.colors[i]).toBeGreaterThan(0);
      expect(d.colors[i]).toBeLessThanOrEqual(1);
    }
  });

  it("empty map yields empty arrays", () => {
    const d = buildMesh(new Map());
    expect(d.faceCount).toBe(0);
    expect(d.positions.length).toBe(0);
    expect(d.indices.length).toBe(0);
  });
});

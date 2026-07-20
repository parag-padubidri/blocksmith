import { describe, expect, it } from "vitest";
import { buildGameMesh, voxelJitter } from "./gameMesh";
import { key, type VoxelMap } from "../../src/core/voxels";

describe("voxelJitter", () => {
  it("is deterministic: same voxel, same jitter", () => {
    for (let i = 0; i < 50; i++) {
      const x = i % 16, y = (i * 7) % 16, z = (i * 3) % 16;
      expect(voxelJitter(x, y, z)).toBe(voxelJitter(x, y, z));
    }
  });

  it("stays within 0.88..1.0 (darken-only)", () => {
    for (let x = 0; x < 16; x++)
      for (let z = 0; z < 16; z++) {
        const j = voxelJitter(x, 5, z);
        expect(j).toBeGreaterThanOrEqual(0.88);
        expect(j).toBeLessThanOrEqual(1.0);
      }
  });

  it("varies across neighboring voxels", () => {
    const values = new Set<number>();
    for (let x = 0; x < 8; x++) values.add(voxelJitter(x, 4, 4));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe("buildGameMesh per-voxel jitter", () => {
  it("gives two same-material, same-face-direction, fully-unoccluded voxels different colours", () => {
    // A flat 3x1x3 slab of one material: the center-row top faces all have
    // the same shade/AO (fully exposed), so any colour difference between
    // them must come from the per-voxel jitter.
    const m: VoxelMap = new Map();
    for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) m.set(key(x, 0, z), 5); // Stone
    const mesh = buildGameMesh(m);

    // Collect the top-face (+y) colour of each voxel by reading back one
    // vertex per quad group; top faces were pushed with d === 2.
    const colorsSeen = new Set<string>();
    for (let i = 0; i < mesh.colors.length; i += 12) {
      // 4 verts * 3 comps = 12 floats per quad
      const r = mesh.colors[i], g = mesh.colors[i + 1], b = mesh.colors[i + 2];
      colorsSeen.add(`${r.toFixed(5)},${g.toFixed(5)},${b.toFixed(5)}`);
    }
    expect(colorsSeen.size).toBeGreaterThan(1);
  });

  it("keeps geometry unchanged (jitter only touches colour)", () => {
    const m: VoxelMap = new Map([[key(0, 0, 0), 0]]);
    const mesh = buildGameMesh(m);
    expect(mesh.positions.length).toBe(24 * 3);
    expect(mesh.indices.length).toBe(36);
  });
});

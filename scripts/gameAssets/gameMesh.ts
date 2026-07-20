// Game-specific voxel mesh builder for Balloon Pop "Candy Meadow Deluxe".
// Same culled/unwelded geometry as the app's meshBuild, but:
//   - remaps palette indices to the Candy Meadow hexes (spec §1),
//   - bakes per-corner ambient occlusion into vertex colours,
//   - tints shadows toward violet #5B4E8C (never grey/black, spec §1),
//   - gives top faces a +10% sun-bounce lift (spec §4),
//   - jitters each voxel's brightness deterministically so every block reads
//     as a distinct shade of its material colour, uniformly across all models
//     (see voxelJitter — generalizes the balloon's hand-authored pick()).
// Kept out of src/ so the BlockSmith app palette is untouched.

import type { VoxelMap, Cell } from "../../src/core/voxels";
import { DIRS, key, parseKey } from "../../src/core/voxels";
import { CORNERS } from "../../src/core/meshBuild";
import { srgbToLinear, type RGB } from "../../src/core/shading";

// Candy Meadow remap of the 16 BlockSmith palette slots.
const CM_HEX = [
  "#7EDB6A", // 0 Grass
  "#3FA84F", // 1 Leaves (trees)
  "#9C6B3F", // 2 Dirt
  "#C79A5E", // 3 Oak
  "#6E4E2E", // 4 Dark Oak
  "#A9A6C0", // 5 Stone -> soft lilac-grey (wolf body)
  "#7C778F", // 6 Cobble
  "#F0E4B0", // 7 Sand
  "#6FC3F2", // 8 Water -> candy sky blue
  "#FBFDFF", // 9 Snow (near-white; balloon base, wolf belly)
  "#F2555F", // 10 Red
  "#FF9F4D", // 11 Orange
  "#FFD34D", // 12 Yellow -> gold
  "#B07BE0", // 13 Purple
  "#FF7BAC", // 14 Pink -> hero pink
  "#3D3833", // 15 Coal -> ink (dot eyes)
  "#FF9BC0", // 16 Blush (cheeks) — game-only extension
  "#EEE8F2", // 17 Snow dim (~93%) — per-voxel shade jitter, game-only
  "#DFD8E8", // 18 Snow dimmer (~86%) — per-voxel shade jitter, game-only
];

const VIOLET: RGB = [0x5b / 255, 0x4e / 255, 0x8c / 255];

// Per-face brightness (+x, -x, +y, -y, +z, -z). Top brightest, bottom deepest.
const FACE_SHADE = [0.86, 0.8, 1.0, 0.55, 0.74, 0.7];
// Ambient-occlusion brightness curve for corner occlusion 0..3.
const AO_CURVE = [0.62, 0.76, 0.88, 1.0];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

function occ(v: VoxelMap, x: number, y: number, z: number): number {
  return v.has(key(x, y, z)) ? 1 : 0;
}

// Deterministic per-voxel brightness jitter so every block reads as a
// slightly different shade of its material colour ("each block picks a
// different brightness level" — the balloon's pick()-of-3-shades trick,
// generalized to every model instead of hand-authored per model). Keyed by
// voxel position only (not face index), so all 6 faces of one block agree —
// unlike shading.ts's per-face grain(). Darken-only (never brightens) so it
// composes safely with the AO/shadow-tint math below without risking
// bright > 1. Same hash family as grain(), never Math.random().
export function voxelJitter(x: number, y: number, z: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  const f = s - Math.floor(s); // 0..1
  return 1 - f * 0.12; // 0.88 .. 1.0
}

function normalAxis(d: number): number {
  const n = DIRS[d];
  return n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2;
}

export interface GameMeshData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export function buildGameMesh(voxels: VoxelMap): GameMeshData {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let n = 0;
  const baseCache = new Map<number, RGB>();

  voxels.forEach((ci, k) => {
    const [x, y, z] = parseKey(k);
    let base = baseCache.get(ci);
    if (!base) {
      base = hexToRgb(CM_HEX[ci] ?? "#ff00ff");
      baseCache.set(ci, base);
    }
    const jitter = voxelJitter(x, y, z);
    for (let d = 0; d < 6; d++) {
      const nb = DIRS[d] as Cell;
      if (voxels.has(key(x + nb[0], y + nb[1], z + nb[2]))) continue; // cull interior

      const shade = FACE_SHADE[d];
      const nAxis = normalAxis(d);
      const tangents = [0, 1, 2].filter((a) => a !== nAxis);
      const corners = CORNERS[d];

      for (let vi = 0; vi < 4; vi++) {
        const c = corners[vi];
        // Signs along each tangent axis toward this corner.
        const s1 = c[tangents[0]] === 1 ? 1 : -1;
        const s2 = c[tangents[1]] === 1 ? 1 : -1;
        const o1: [number, number, number] = [0, 0, 0];
        o1[tangents[0]] = s1;
        const o2: [number, number, number] = [0, 0, 0];
        o2[tangents[1]] = s2;

        const side1 = occ(voxels, x + nb[0] + o1[0], y + nb[1] + o1[1], z + nb[2] + o1[2]);
        const side2 = occ(voxels, x + nb[0] + o2[0], y + nb[1] + o2[1], z + nb[2] + o2[2]);
        const cor = occ(
          voxels,
          x + nb[0] + o1[0] + o2[0],
          y + nb[1] + o1[1] + o2[1],
          z + nb[2] + o1[2] + o2[2]
        );
        const ao = side1 && side2 ? 0 : 3 - side1 - side2 - cor;
        const bright = shade * AO_CURVE[ao] * jitter;

        let r = base[0], g = base[1], b = base[2];
        if (d === 2) { r += (1 - r) * 0.1; g += (1 - g) * 0.1; b += (1 - b) * 0.1; } // top bounce
        r *= bright; g *= bright; b *= bright;

        const shadowAmt = Math.min(0.22, (1 - bright) * 0.5); // violet-tint the dark
        r += (VIOLET[0] - r) * shadowAmt;
        g += (VIOLET[1] - g) * shadowAmt;
        b += (VIOLET[2] - b) * shadowAmt;

        positions.push(x + c[0], y + c[1], z + c[2]);
        colors.push(srgbToLinear(Math.min(1, r)), srgbToLinear(Math.min(1, g)), srgbToLinear(Math.min(1, b)));
      }
      indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
      n += 4;
    }
  });

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}

// voxels -> flat geometry arrays: interior-face culled, unwelded (4 verts per
// face — vertex sharing would break flat shading and per-face color).
// Used as the single geometry source for both the viewport and the glTF export.

import type { VoxelMap } from "./voxels";
import { DIRS, key, parseKey } from "./voxels";
import { PALETTE, hexToRgb, shadedFaceColor, srgbToLinear, type RGB } from "./shading";

// Quad corner offsets per face (CCW seen from outside), same face order as DIRS.
export const CORNERS: readonly (readonly [number, number, number][])[] = [
  [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
  [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
  [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
  [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
  [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
];

export interface MeshData {
  positions: Float32Array; // xyz per vertex
  colors: Float32Array; // rgb per vertex, LINEAR color space
  indices: Uint32Array;
  faceCount: number;
  vertexCount: number;
}

// Colors come out in linear space: that's what glTF COLOR_0 requires and what
// three's renderer expects in geometry attributes (it encodes to sRGB on output),
// so one build serves both consumers and they match exactly.
export function buildMesh(voxels: VoxelMap): MeshData {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let n = 0;
  let faceCount = 0;
  const baseCache = new Map<number, RGB>();
  voxels.forEach((ci, k) => {
    const [x, y, z] = parseKey(k);
    let base = baseCache.get(ci);
    if (!base) {
      base = hexToRgb(PALETTE[ci].hex);
      baseCache.set(ci, base);
    }
    for (let d = 0; d < 6; d++) {
      const nk = key(x + DIRS[d][0], y + DIRS[d][1], z + DIRS[d][2]);
      if (voxels.has(nk)) continue; // interior face — cull
      const [r, g, b] = shadedFaceColor(base, x, y, z, d);
      const lr = srgbToLinear(r);
      const lg = srgbToLinear(g);
      const lb = srgbToLinear(b);
      for (const [cx, cy, cz] of CORNERS[d]) {
        positions.push(x + cx, y + cy, z + cz);
        colors.push(lr, lg, lb);
      }
      indices.push(n, n + 1, n + 2, n, n + 2, n + 3); // quad -> 2 tris, CCW
      n += 4;
      faceCount++;
    }
  });
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    faceCount,
    vertexCount: n,
  };
}

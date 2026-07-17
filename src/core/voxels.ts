// Voxel state: Map<"x,y,z", paletteIndex> within a 16^3 grid.

export const GRID = 16;

export type VoxelMap = Map<string, number>;

export type Cell = [number, number, number];

// Face order everywhere: +x, -x, +y, -y, +z, -z
export const DIRS: readonly Cell[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

export const parseKey = (k: string): Cell => {
  const [x, y, z] = k.split(",").map(Number);
  return [x, y, z];
};

export const inBounds = (x: number, y: number, z: number): boolean =>
  x >= 0 && x < GRID && y >= 0 && y < GRID && z >= 0 && z < GRID;

export interface ModelJSON {
  size: number;
  voxels: { x: number; y: number; z: number; c: number }[];
}

export function serialize(voxels: VoxelMap): ModelJSON {
  const arr: ModelJSON["voxels"] = [];
  voxels.forEach((c, k) => {
    const [x, y, z] = parseKey(k);
    arr.push({ x, y, z, c });
  });
  return { size: GRID, voxels: arr };
}

// Lenient by design: skip out-of-bounds voxels, clamp bad color indices,
// tolerate junk entries. LLM-generated JSON is a supported input path.
export function deserialize(data: unknown, paletteSize: number): VoxelMap {
  const m: VoxelMap = new Map();
  if (typeof data !== "object" || data === null) return m;
  const voxels = (data as { voxels?: unknown }).voxels;
  if (!Array.isArray(voxels)) return m;
  for (const v of voxels) {
    if (typeof v !== "object" || v === null) continue;
    const { x, y, z, c } = v as { x?: unknown; y?: unknown; z?: unknown; c?: unknown };
    const xi = Math.floor(Number(x));
    const yi = Math.floor(Number(y));
    const zi = Math.floor(Number(z));
    if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(zi)) continue;
    if (!inBounds(xi, yi, zi)) continue;
    const ci = Math.min(paletteSize - 1, Math.max(0, Math.floor(Number(c)) || 0));
    m.set(key(xi, yi, zi), ci);
  }
  return m;
}

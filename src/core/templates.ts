// Starter models — the app never opens to an empty grid.

import type { VoxelMap } from "./voxels";
import { key } from "./voxels";

export function starterTree(): VoxelMap {
  const m: VoxelMap = new Map();
  for (let y = 0; y < 4; y++) m.set(key(8, y, 8), 4); // dark oak trunk
  for (let x = 6; x <= 10; x++)
    for (let z = 6; z <= 10; z++)
      for (let y = 3; y <= 5; y++) {
        const edge = (x === 6 || x === 10) && (z === 6 || z === 10);
        if (y === 5 && edge) continue;
        if (!(x === 8 && z === 8 && y < 4)) m.set(key(x, y, z), 1);
      }
  m.set(key(8, 6, 8), 1);
  m.set(key(7, 6, 8), 1);
  m.set(key(8, 6, 7), 1);
  m.set(key(9, 6, 8), 1);
  m.set(key(8, 6, 9), 1);
  return m;
}

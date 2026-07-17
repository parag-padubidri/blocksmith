// OBJ + MTL export: one material per color x direction (c{i}_d{j}), shade baked
// into Kd, illum 0. OBJ vertex colors are non-standard and silently dropped by
// Unity and most viewers — that's why materials carry the color. Grain is lost
// here by format limitation; acceptable and documented.

import type { VoxelMap } from "../voxels";
import { DIRS, key, parseKey } from "../voxels";
import { CORNERS } from "../meshBuild";
import { PALETTE, hexToRgb, shadedFaceColor } from "../shading";

export function toOBJMTL(voxels: VoxelMap): { obj: string; mtl: string } {
  const mats = new Map<string, [number, number, number]>();
  const facesByMat = new Map<string, string>();
  let v = "";
  let n = 0;
  voxels.forEach((ci, k) => {
    const [x, y, z] = parseKey(k);
    const base = hexToRgb(PALETTE[ci].hex);
    for (let d = 0; d < 6; d++) {
      const nk = key(x + DIRS[d][0], y + DIRS[d][1], z + DIRS[d][2]);
      if (voxels.has(nk)) continue; // interior face — cull
      const name = `c${ci}_d${d}`;
      if (!mats.has(name)) {
        mats.set(name, shadedFaceColor(base, x, y, z, d, false));
        facesByMat.set(name, "");
      }
      for (const [cx, cy, cz] of CORNERS[d]) {
        v += `v ${x + cx} ${y + cy} ${z + cz}\n`;
      }
      facesByMat.set(name, facesByMat.get(name) + `f ${n + 1} ${n + 2} ${n + 3} ${n + 4}\n`);
      n += 4;
    }
  });
  let obj = "# blocksmith export\nmtllib model.mtl\n" + v;
  let mtl = "# blocksmith materials\n";
  mats.forEach((rgb, name) => {
    const [r, g, b] = rgb.map((x) => x.toFixed(4));
    obj += `usemtl ${name}\n${facesByMat.get(name)}`;
    mtl += `newmtl ${name}\nKd ${r} ${g} ${b}\nKa ${r} ${g} ${b}\nKs 0 0 0\nillum 0\n`;
  });
  return { obj, mtl };
}

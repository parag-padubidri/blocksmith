// Model <-> lz-string URL fragment for zero-backend sharing.

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { serialize, deserialize, type VoxelMap } from "./voxels";
import { PALETTE } from "./shading";

export function encodeShare(voxels: VoxelMap): string {
  return compressToEncodedURIComponent(JSON.stringify(serialize(voxels)));
}

export function decodeShare(payload: string): VoxelMap | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const m = deserialize(JSON.parse(json), PALETTE.length);
    return m.size > 0 ? m : null;
  } catch {
    return null;
  }
}

export function shareFragment(voxels: VoxelMap): string {
  return "#m=" + encodeShare(voxels);
}

// "#m=..." -> VoxelMap, or null for anything else (including garbage payloads).
export function parseShareHash(hash: string): VoxelMap | null {
  const m = /^#m=(.+)$/.exec(hash);
  return m ? decodeShare(m[1]) : null;
}

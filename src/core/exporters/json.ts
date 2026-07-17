// Native save format: { size: 16, voxels: [{x,y,z,c}] }.
// Doubles as the LLM entry point — keep the schema stable and parsing lenient.

import type { VoxelMap } from "../voxels";
import { serialize, deserialize } from "../voxels";
import { PALETTE } from "../shading";

export function toJSONText(voxels: VoxelMap): string {
  return JSON.stringify(serialize(voxels));
}

// Returns null only if the text isn't JSON at all or contains no usable voxels.
export function fromJSONText(text: string): VoxelMap | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const m = deserialize(data, PALETTE.length);
  return m.size > 0 ? m : null;
}

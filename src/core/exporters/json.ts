// Native save format: { size: 16, voxels: [{x,y,z,c}] }.
// Doubles as the LLM entry point — keep the schema stable and parsing lenient.

import type { VoxelMap } from "../voxels";
import { serialize, deserialize } from "../voxels";
import { PALETTE } from "../shading";

export function toJSONText(voxels: VoxelMap): string {
  return JSON.stringify(serialize(voxels));
}

// Mobile keyboards and chat apps (notably iOS) rewrite straight quotes into
// typographic ones on copy, which breaks JSON.parse. Pasted model JSON is the
// whole point of the AI workflow, so tolerate it rather than reject the paste.
function normalizeSmartQuotes(text: string): string {
  return text.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'");
}

// Returns null only if the text isn't JSON at all or contains no usable voxels.
export function fromJSONText(text: string): VoxelMap | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    try {
      data = JSON.parse(normalizeSmartQuotes(text));
    } catch {
      return null;
    }
  }
  const m = deserialize(data, PALETTE.length);
  return m.size > 0 ? m : null;
}

import { describe, expect, it } from "vitest";
import { toGLTFJson } from "./gltf";
import { key, type VoxelMap } from "../voxels";

// GLTFExporter uses FileReader to serialize buffers; Node has Blob but no
// FileReader, so shim the two read modes the exporter uses.
class FileReaderShim {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((b) => {
      let bin = "";
      for (const byte of new Uint8Array(b)) bin += String.fromCharCode(byte);
      this.result = "data:application/octet-stream;base64," + btoa(bin);
      this.onloadend?.();
    });
  }
}
(globalThis as Record<string, unknown>).FileReader ??= FileReaderShim;

interface GLTFDoc {
  asset: { version: string };
  extensionsUsed?: string[];
  materials?: { extensions?: Record<string, unknown> }[];
  meshes?: { primitives: { attributes: Record<string, number>; indices?: number }[] }[];
  accessors?: { count: number; type: string }[];
}

describe("glTF export (via three GLTFExporter)", () => {
  it("emits KHR_materials_unlit and COLOR_0 vertex colors", async () => {
    const m: VoxelMap = new Map([
      [key(5, 0, 5), 0],
      [key(5, 1, 5), 10],
    ]);
    const doc = (await toGLTFJson(m)) as unknown as GLTFDoc;
    expect(doc.asset.version).toBe("2.0");
    expect(doc.extensionsUsed).toContain("KHR_materials_unlit");
    expect(doc.materials![0].extensions).toHaveProperty("KHR_materials_unlit");
    const prim = doc.meshes![0].primitives[0];
    expect(prim.attributes).toHaveProperty("POSITION");
    expect(prim.attributes).toHaveProperty("COLOR_0");
    expect(prim.indices).toBeDefined();
    // 2 stacked voxels, interior faces culled: 40 verts, 60 indices
    const pos = doc.accessors![prim.attributes.POSITION];
    const col = doc.accessors![prim.attributes.COLOR_0];
    const idx = doc.accessors![prim.indices!];
    expect(pos.count).toBe(40);
    expect(col.count).toBe(40);
    expect(idx.count).toBe(60);
  });
});

// Acceptance check from the plan: the exported .glb passes the Khronos glTF
// validator with zero errors.

import { describe, expect, it } from "vitest";
// @ts-expect-error no types shipped
import validator from "gltf-validator";
import { toGLB } from "./gltf";
import { key, type VoxelMap } from "../voxels";
import { starterTree } from "../templates";

// Same FileReader shim as gltf.test.ts — GLTFExporter needs it under Node.
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

interface Report {
  issues: {
    numErrors: number;
    numWarnings: number;
    messages: { severity: number; message: string }[];
  };
}

async function validate(voxels: VoxelMap): Promise<Report> {
  const glb = await toGLB(voxels);
  return validator.validateBytes(new Uint8Array(glb)) as Promise<Report>;
}

describe("Khronos glTF validation", () => {
  it("starter tree GLB has zero errors", async () => {
    const report = await validate(starterTree());
    // Listing the error messages makes a failure self-explanatory.
    expect(report.issues.messages.filter((m) => m.severity === 0)).toEqual([]);
    expect(report.issues.numErrors).toBe(0);
  });

  it("single-voxel GLB has zero errors", async () => {
    const report = await validate(new Map([[key(0, 0, 0), 15]]));
    expect(report.issues.messages.filter((m) => m.severity === 0)).toEqual([]);
    expect(report.issues.numErrors).toBe(0);
  });
});

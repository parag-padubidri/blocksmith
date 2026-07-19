// Headless batch exporter: turns each GAME_MODELS entry into a validated .glb
// using BlockSmith's own exporter (the path verified in gltfValidate.test.ts).
// A reusable "batch export" tool — the model set lives in models.ts and the
// output directory is configurable, so it isn't tied to any one consumer.
//
// Run (writes to ./dist-assets/voxel-models by default):
//   npx vitest run --config vitest.assets.config.ts
//
// Point it at another project by setting VOXEL_EXPORT_DIR, e.g. to feed a Unity
// game's Resources folder:
//   VOXEL_EXPORT_DIR=/path/to/Game/Assets/Resources/VoxelModels \
//     npx vitest run --config vitest.assets.config.ts
//
// This lives outside the app test suite (src/**) so `npm test` never triggers it.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error no types shipped
import validator from "gltf-validator";
import { toGameGLB } from "./gameGltf";
import { GAME_MODELS } from "./models";

// GLTFExporter uses FileReader to serialize buffers; Node lacks it. Same shim as
// the core gltf tests.
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

// Output directory: VOXEL_EXPORT_DIR if set (absolute or relative), otherwise an
// in-repo dist folder. Never writes outside this repo unless explicitly pointed
// elsewhere.
const OUT_DIR = resolve(process.env.VOXEL_EXPORT_DIR ?? "dist-assets/voxel-models");

interface Report {
  issues: { numErrors: number; messages: { severity: number; message: string }[] };
}

describe("voxel asset batch export", () => {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const model of GAME_MODELS) {
    it(`exports ${model.name}.glb (zero validator errors)`, async () => {
      const voxels = model.build();
      expect(voxels.size).toBeGreaterThan(0);

      const glb = await toGameGLB(voxels);
      const bytes = new Uint8Array(glb);

      const report = (await validator.validateBytes(bytes)) as Report;
      const errors = report.issues.messages.filter((mm) => mm.severity === 0);
      expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
      expect(report.issues.numErrors).toBe(0);

      const outPath = join(OUT_DIR, `${model.name}.glb`);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, bytes);
      expect(bytes.byteLength).toBeGreaterThan(100);
    });
  }
});

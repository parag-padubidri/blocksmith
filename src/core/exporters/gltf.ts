// .glb export via three's GLTFExporter, fed by our hand-rolled mesh builder
// (culling + shading + grain). MeshBasicMaterial + vertex colors makes the
// exporter emit KHR_materials_unlit automatically.

import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { VoxelMap } from "../voxels";
import { buildMesh } from "../meshBuild";

export function buildExportMesh(voxels: VoxelMap): Mesh {
  const data = buildMesh(voxels);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(data.positions, 3));
  geo.setAttribute("color", new BufferAttribute(data.colors, 3));
  geo.setIndex(new BufferAttribute(data.indices, 1));
  const mesh = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true }));
  mesh.name = "voxel_model";
  return mesh;
}

export function toGLB(voxels: VoxelMap): Promise<ArrayBuffer> {
  const mesh = buildExportMesh(voxels);
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      mesh,
      (result) => resolve(result as ArrayBuffer),
      reject,
      { binary: true }
    );
  });
}

// JSON-flavoured export, used by tests to inspect the produced document.
export function toGLTFJson(voxels: VoxelMap): Promise<Record<string, unknown>> {
  const mesh = buildExportMesh(voxels);
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      mesh,
      (result) => resolve(result as Record<string, unknown>),
      reject,
      { binary: false }
    );
  });
}

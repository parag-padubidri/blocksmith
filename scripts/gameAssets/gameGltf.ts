// GLB export fed by the Candy Meadow game mesh builder (buildGameMesh),
// mirroring src/core/exporters/gltf.ts. MeshBasicMaterial + vertex colours ->
// KHR_materials_unlit, which glTFast maps to Shader Graphs/glTF-unlit in URP.

import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { VoxelMap } from "../../src/core/voxels";
import { buildGameMesh } from "./gameMesh";

export function toGameGLB(voxels: VoxelMap): Promise<ArrayBuffer> {
  const data = buildGameMesh(voxels);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(data.positions, 3));
  geo.setAttribute("color", new BufferAttribute(data.colors, 3));
  geo.setIndex(new BufferAttribute(data.indices, 1));
  const mesh = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true }));
  mesh.name = "voxel_model";
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(mesh, (r) => resolve(r as ArrayBuffer), reject, { binary: true });
  });
}

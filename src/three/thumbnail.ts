// Offscreen thumbnail renders for the library. One shared renderer is reused
// so 50+ saves don't leak WebGL contexts.

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { parseKey, type VoxelMap } from "../core/voxels";
import { buildMesh } from "../core/meshBuild";

const SIZE = 144;
let renderer: WebGLRenderer | null = null;

function getRenderer(): WebGLRenderer {
  if (!renderer) {
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(1);
  }
  return renderer;
}

export function renderThumbnail(voxels: VoxelMap): string {
  const r = getRenderer();
  const scene = new Scene();
  scene.background = new Color("#1e222b");

  const data = buildMesh(voxels);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(data.positions, 3));
  geo.setAttribute("color", new BufferAttribute(data.colors, 3));
  geo.setIndex(new BufferAttribute(data.indices, 1));
  const material = new MeshBasicMaterial({ vertexColors: true });
  scene.add(new Mesh(geo, material));

  // Frame the model bounds from a fixed iso-ish angle.
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  voxels.forEach((_c, k) => {
    const [x, y, z] = parseKey(k);
    min = min.min(new Vector3(x, y, z));
    max = max.max(new Vector3(x + 1, y + 1, z + 1));
  });
  if (voxels.size === 0) {
    min.set(0, 0, 0);
    max.set(1, 1, 1);
  }
  const center = min.clone().add(max).multiplyScalar(0.5);
  const radius = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) * 0.75 + 0.5;

  const camera = new PerspectiveCamera(40, 1, 0.1, 200);
  const dist = radius / Math.tan((camera.fov * Math.PI) / 360) * 1.15;
  camera.position
    .copy(center)
    .add(new Vector3(1, 0.75, 1).normalize().multiplyScalar(dist));
  camera.lookAt(center);

  r.render(scene, camera);
  const url = r.domElement.toDataURL("image/png");
  geo.dispose();
  material.dispose();
  return url;
}

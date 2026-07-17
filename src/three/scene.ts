// Viewport: scene, orbit camera, raycasting, voxel mesh sync.
// Interaction model (validated): tap = apply tool, drag >6px = orbit,
// pinch/scroll = zoom.

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  GridHelper,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GRID, type Cell, type VoxelMap } from "../core/voxels";
import { buildMesh } from "../core/meshBuild";

// What a tap (or hover) hit: the ground plane, or a voxel face.
export type Pick =
  | { type: "ground"; x: number; z: number }
  | { type: "voxel"; cell: Cell; normal: Cell };

export interface VoxelSceneOptions {
  onTap: (pick: Pick) => void;
  onHover?: (pick: Pick | null) => void;
}

export class VoxelScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(50, 1, 0.1, 500);
  private voxelMesh: Mesh;
  private ground: Mesh;
  private raycaster = new Raycaster();
  private orbit = { theta: 0.75, phi: 1.05, radius: 30 };
  private target = new Vector3(GRID / 2, 4.5, GRID / 2);
  private ro: ResizeObserver;
  private raf = 0;
  private mount: HTMLElement;
  private opts: VoxelSceneOptions;
  private disposers: (() => void)[] = [];
  private ghostGeo = new BoxGeometry(1.001, 1.001, 1.001);
  private ghostMat = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  private ghostPool: Mesh[] = [];

  constructor(mount: HTMLElement, opts: VoxelSceneOptions) {
    this.mount = mount;
    this.opts = opts;
    if (import.meta.env.DEV) {
      // Dev hook: lets headless environments force a frame (rAF is suspended
      // in hidden tabs, freezing the loop).
      (window as unknown as Record<string, unknown>).__bsDebug = this;
    }
    this.scene.background = new Color("#1a1d24");
    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";

    const grid = new GridHelper(GRID, GRID, 0x3a4150, 0x2a2f3a);
    grid.position.set(GRID / 2, 0, GRID / 2);
    this.scene.add(grid);

    const planeGeo = new PlaneGeometry(GRID, GRID);
    planeGeo.rotateX(-Math.PI / 2);
    this.ground = new Mesh(planeGeo, new MeshBasicMaterial({ visible: false }));
    this.ground.position.set(GRID / 2, 0, GRID / 2);
    this.scene.add(this.ground);

    this.voxelMesh = new Mesh(
      new BufferGeometry(),
      new MeshBasicMaterial({ vertexColors: true })
    );
    this.scene.add(this.voxelMesh);

    this.applyCamera();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    resize();
    this.ro = new ResizeObserver(resize);
    this.ro.observe(mount);

    this.bindPointer();

    const size = new Vector2();
    const loop = () => {
      // Belt and braces: some engines miss the initial ResizeObserver callback.
      this.renderer.getSize(size);
      if (size.x !== mount.clientWidth || size.y !== mount.clientHeight) resize();
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  private applyCamera() {
    const o = this.orbit;
    o.phi = Math.max(0.15, Math.min(1.45, o.phi));
    o.radius = Math.max(8, Math.min(70, o.radius));
    this.camera.position.set(
      this.target.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
      this.target.y + o.radius * Math.cos(o.phi),
      this.target.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta)
    );
    this.camera.lookAt(this.target);
  }

  private ndc(e: { clientX: number; clientY: number }): Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
  }

  pick(e: { clientX: number; clientY: number }): Pick | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hits = this.raycaster.intersectObjects([this.voxelMesh, this.ground], false);
    if (!hits.length) return null;
    const hit = hits[0];
    if (hit.object === this.ground) {
      const x = Math.floor(hit.point.x);
      const z = Math.floor(hit.point.z);
      if (x < 0 || x >= GRID || z < 0 || z >= GRID) return null;
      return { type: "ground", x, z };
    }
    if (!hit.face) return null;
    const n = hit.face.normal;
    // Step half a unit inward from the hit face to land inside the voxel.
    const cell: Cell = [
      Math.floor(hit.point.x - n.x * 0.5),
      Math.floor(hit.point.y - n.y * 0.5),
      Math.floor(hit.point.z - n.z * 0.5),
    ];
    return {
      type: "voxel",
      cell,
      normal: [Math.round(n.x), Math.round(n.y), Math.round(n.z)],
    };
  }

  private bindPointer() {
    const el = this.renderer.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let downPos: { x: number; y: number } | null = null;
    let orbiting = false;
    let pinchDist = 0;

    const onDown = (e: PointerEvent) => {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic events have no active pointer — capture is best-effort.
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downPos = { x: e.clientX, y: e.clientY };
        orbiting = false;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        orbiting = true;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) {
        this.opts.onHover?.(this.pick(e));
        return;
      }
      const prev = pointers.get(e.pointerId)!;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.orbit.radius *= pinchDist / Math.max(d, 1);
        pinchDist = d;
        this.applyCamera();
        return;
      }
      if (pointers.size !== 1) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (!orbiting && downPos) {
        const total = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (total > 6) orbiting = true;
      }
      if (orbiting) {
        this.orbit.theta -= dx * 0.008;
        this.orbit.phi -= dy * 0.008;
        this.applyCamera();
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0 && !orbiting && downPos) {
        const p = this.pick(e);
        if (p) this.opts.onTap(p);
      }
      if (pointers.size === 0) downPos = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.orbit.radius *= 1 + e.deltaY * 0.001;
      this.applyCamera();
    };
    const onLeave = () => this.opts.onHover?.(null);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    this.disposers.push(() => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
    });
  }

  // Translucent preview voxels showing where Place will land (plural so
  // mirror mode can show both sides).
  setGhost(cells: Cell[], hex?: string) {
    if (hex) this.ghostMat.color.set(hex);
    while (this.ghostPool.length < cells.length) {
      const m = new Mesh(this.ghostGeo, this.ghostMat);
      this.ghostPool.push(m);
      this.scene.add(m);
    }
    this.ghostPool.forEach((m, i) => {
      if (i < cells.length) {
        m.visible = true;
        m.position.set(cells[i][0] + 0.5, cells[i][1] + 0.5, cells[i][2] + 0.5);
      } else {
        m.visible = false;
      }
    });
  }

  setVoxels(voxels: VoxelMap) {
    const data = buildMesh(voxels);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(data.positions, 3));
    geo.setAttribute("color", new BufferAttribute(data.colors, 3));
    geo.setIndex(new BufferAttribute(data.indices, 1));
    this.voxelMesh.geometry.dispose();
    this.voxelMesh.geometry = geo;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.disposers.forEach((d) => d());
    this.voxelMesh.geometry.dispose();
    this.ghostGeo.dispose();
    this.ghostMat.dispose();
    this.renderer.dispose();
    this.mount.removeChild(this.renderer.domElement);
  }
}

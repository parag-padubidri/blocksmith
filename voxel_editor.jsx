import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ---------- constants ----------
const GRID = 16;
const PALETTE = [
  { name: "Grass", hex: "#6abe30" },
  { name: "Leaves", hex: "#3e7a25" },
  { name: "Dirt", hex: "#8a5a2b" },
  { name: "Oak", hex: "#a8824f" },
  { name: "Dark Oak", hex: "#5c4326" },
  { name: "Stone", hex: "#8d8d8d" },
  { name: "Cobble", hex: "#6e6e6e" },
  { name: "Sand", hex: "#e3d9a6" },
  { name: "Water", hex: "#3b6fd4" },
  { name: "Snow", hex: "#f2f4f5" },
  { name: "Red", hex: "#c33c3c" },
  { name: "Orange", hex: "#e08a2e" },
  { name: "Yellow", hex: "#e5c53a" },
  { name: "Purple", hex: "#8a4fbf" },
  { name: "Pink", hex: "#e08ab8" },
  { name: "Coal", hex: "#2f2f34" },
];
// Minecraft-style directional shade per box face: +x,-x,+y,-y,+z,-z
const FACE_SHADE = [0.8, 0.8, 1.0, 0.5, 0.65, 0.65];
const key = (x, y, z) => `${x},${y},${z}`;

// deterministic per-face grain so rebuilds don't flicker
function grain(x, y, z, f) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + f * 4.171) * 43758.5453;
  return (s - Math.floor(s)) * 0.12 - 0.06; // -0.06 .. +0.06
}

function starterTree() {
  const m = new Map();
  for (let y = 0; y < 4; y++) m.set(key(8, y, 8), 4); // dark oak trunk
  for (let x = 6; x <= 10; x++)
    for (let z = 6; z <= 10; z++)
      for (let y = 3; y <= 5; y++) {
        const edge = (x === 6 || x === 10) && (z === 6 || z === 10);
        if (y === 5 && edge) continue;
        if (!(x === 8 && z === 8 && y < 4)) m.set(key(x, y, z), 1);
      }
  m.set(key(8, 6, 8), 1);
  m.set(key(7, 6, 8), 1);
  m.set(key(8, 6, 7), 1);
  m.set(key(9, 6, 8), 1);
  m.set(key(8, 6, 9), 1);
  return m;
}

// ---------- exporters ----------
function toOBJMTL(voxels) {
  const dirs = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  // quad corner offsets per face (CCW seen from outside)
  const corners = [
    [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ];
  const mats = new Map(); // name -> [r,g,b]
  const facesByMat = new Map(); // name -> face lines
  let v = "";
  let n = 0;
  voxels.forEach((ci, k) => {
    const [x, y, z] = k.split(",").map(Number);
    const c = new THREE.Color(PALETTE[ci].hex);
    for (let d = 0; d < 6; d++) {
      const nk = key(x + dirs[d][0], y + dirs[d][1], z + dirs[d][2]);
      if (voxels.has(nk)) continue; // interior face — cull
      const name = `c${ci}_d${d}`;
      if (!mats.has(name)) {
        const s = FACE_SHADE[d];
        mats.set(name, [
          Math.min(1, c.r * s), Math.min(1, c.g * s), Math.min(1, c.b * s),
        ]);
        facesByMat.set(name, "");
      }
      for (const [cx, cy, cz] of corners[d]) {
        v += `v ${x + cx} ${y + cy} ${z + cz}\n`;
      }
      facesByMat.set(
        name,
        facesByMat.get(name) + `f ${n + 1} ${n + 2} ${n + 3} ${n + 4}\n`
      );
      n += 4;
    }
  });
  let obj = "# blocksmith export\nmtllib model.mtl\n" + v;
  let mtl = "# blocksmith materials\n";
  mats.forEach((rgb, name) => {
    const [r, g, b] = rgb.map((x) => x.toFixed(4));
    obj += `usemtl ${name}\n${facesByMat.get(name)}`;
    mtl += `newmtl ${name}\nKd ${r} ${g} ${b}\nKa ${r} ${g} ${b}\nKs 0 0 0\nillum 0\n`;
  });
  return { obj, mtl };
}

function toGLTF(voxels) {
  const dirs = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  const corners = [
    [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ];
  // glTF COLOR_0 is linear; our palette + shading is sRGB, so convert
  const toLinear = (c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const positions = [];
  const colors = [];
  const indices = [];
  let n = 0;
  voxels.forEach((ci, k) => {
    const [x, y, z] = k.split(",").map(Number);
    const c = new THREE.Color(PALETTE[ci].hex);
    for (let d = 0; d < 6; d++) {
      const nk = key(x + dirs[d][0], y + dirs[d][1], z + dirs[d][2]);
      if (voxels.has(nk)) continue; // cull interior faces
      const shade = FACE_SHADE[d] + grain(x, y, z, d); // grain survives
      const r = toLinear(Math.min(1, c.r * shade));
      const g = toLinear(Math.min(1, c.g * shade));
      const b = toLinear(Math.min(1, c.b * shade));
      for (const [cx, cy, cz] of corners[d]) {
        positions.push(x + cx, y + cy, z + cz);
        colors.push(r, g, b);
      }
      indices.push(n, n + 1, n + 2, n, n + 2, n + 3); // quad -> 2 tris, CCW
      n += 4;
    }
  });

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      min[j] = Math.min(min[j], positions[i + j]);
      max[j] = Math.max(max[j], positions[i + j]);
    }
  }

  const pos = new Float32Array(positions);
  const col = new Float32Array(colors);
  const idx = new Uint32Array(indices);
  const bin = new Uint8Array(pos.byteLength + col.byteLength + idx.byteLength);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(col.buffer), pos.byteLength);
  bin.set(new Uint8Array(idx.buffer), pos.byteLength + col.byteLength);
  let raw = "";
  for (let i = 0; i < bin.length; i += 8192) {
    raw += String.fromCharCode.apply(null, bin.subarray(i, i + 8192));
  }
  const b64 = btoa(raw);

  const gltf = {
    asset: { version: "2.0", generator: "blocksmith" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "voxel_model" }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, COLOR_0: 1 },
            indices: 2,
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        name: "voxel_unlit",
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
        extensions: { KHR_materials_unlit: {} },
      },
    ],
    buffers: [
      {
        byteLength: bin.length,
        uri: "data:application/octet-stream;base64," + b64,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: col.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength + col.byteLength, byteLength: idx.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: n, type: "VEC3", min, max },
      { bufferView: 1, componentType: 5126, count: n, type: "VEC3" },
      { bufferView: 2, componentType: 5125, count: indices.length, type: "SCALAR" },
    ],
  };
  return JSON.stringify(gltf);
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- component ----------
export default function VoxelEditor() {
  const mountRef = useRef(null);
  const voxelsRef = useRef(starterTree());
  const undoRef = useRef([]);
  const [version, setVersion] = useState(0);
  const [tool, setTool] = useState("place");
  const [color, setColor] = useState(0);
  const [exportData, setExportData] = useState(null);
  const [copied, setCopied] = useState(false);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  toolRef.current = tool;
  colorRef.current = color;
  const fileRef = useRef(null);

  const three = useRef({});

  const snapshot = useCallback(() => {
    undoRef.current.push(new Map(voxelsRef.current));
    if (undoRef.current.length > 60) undoRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev) {
      voxelsRef.current = prev;
      setVersion((n) => n + 1);
    }
  }, []);

  const clearAll = useCallback(() => {
    if (voxelsRef.current.size === 0) return;
    snapshot();
    voxelsRef.current = new Map();
    setVersion((n) => n + 1);
  }, [snapshot]);

  // ----- scene setup (once) -----
  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a1d24");
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const grid = new THREE.GridHelper(GRID, GRID, 0x3a4150, 0x2a2f3a);
    grid.position.set(GRID / 2, 0, GRID / 2);
    scene.add(grid);

    const planeGeo = new THREE.PlaneGeometry(GRID, GRID);
    planeGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ground.position.set(GRID / 2, 0, GRID / 2);
    scene.add(ground);

    const group = new THREE.Group();
    scene.add(group);

    const orbit = { theta: 0.75, phi: 1.05, radius: 30 };
    const target = new THREE.Vector3(GRID / 2, 4.5, GRID / 2);
    const applyCamera = () => {
      orbit.phi = Math.max(0.15, Math.min(1.45, orbit.phi));
      orbit.radius = Math.max(8, Math.min(70, orbit.radius));
      camera.position.set(
        target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        target.y + orbit.radius * Math.cos(orbit.phi),
        target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
      );
      camera.lookAt(target);
    };
    applyCamera();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ----- pointer interaction -----
    const raycaster = new THREE.Raycaster();
    const pointers = new Map();
    let downPos = null;
    let orbiting = false;
    let pinchDist = 0;

    const ndc = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
    };

    const act = (e) => {
      raycaster.setFromCamera(ndc(e), camera);
      const hits = raycaster.intersectObjects([...group.children, ground]);
      if (!hits.length) return;
      const hit = hits[0];
      const t = toolRef.current;
      const vox = voxelsRef.current;
      if (hit.object === ground) {
        if (t !== "place") return;
        const x = Math.floor(hit.point.x);
        const z = Math.floor(hit.point.z);
        if (x < 0 || x >= GRID || z < 0 || z >= GRID) return;
        snapshot();
        vox.set(key(x, 0, z), colorRef.current);
      } else {
        const cell = hit.object.userData.cell;
        if (t === "remove") {
          snapshot();
          vox.delete(key(...cell));
        } else if (t === "paint") {
          if (vox.get(key(...cell)) === colorRef.current) return;
          snapshot();
          vox.set(key(...cell), colorRef.current);
        } else {
          const n = hit.face.normal;
          const x = cell[0] + n.x;
          const y = cell[1] + n.y;
          const z = cell[2] + n.z;
          if (x < 0 || x >= GRID || y < 0 || y >= GRID || z < 0 || z >= GRID) return;
          snapshot();
          vox.set(key(x, y, z), colorRef.current);
        }
      }
      setVersion((n) => n + 1);
    };

    const el = renderer.domElement;
    const onDown = (e) => {
      el.setPointerCapture(e.pointerId);
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
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        orbit.radius *= pinchDist / Math.max(d, 1);
        pinchDist = d;
        applyCamera();
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
        orbit.theta -= dx * 0.008;
        orbit.phi -= dy * 0.008;
        applyCamera();
      }
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0 && !orbiting && downPos) act(e);
      if (pointers.size === 0) downPos = null;
    };
    const onWheel = (e) => {
      e.preventDefault();
      orbit.radius *= 1 + e.deltaY * 0.001;
      applyCamera();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    let raf;
    const loop = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    three.current = { group };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      renderer.dispose();
      mount.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- rebuild voxel meshes on change -----
  useEffect(() => {
    const { group } = three.current;
    if (!group) return;
    while (group.children.length) {
      const m = group.children.pop();
      m.geometry.dispose();
    }
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    voxelsRef.current.forEach((ci, k) => {
      const [x, y, z] = k.split(",").map(Number);
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const base = new THREE.Color(PALETTE[ci].hex);
      const colors = new Float32Array(24 * 3);
      for (let f = 0; f < 6; f++) {
        const shade = FACE_SHADE[f] + grain(x, y, z, f);
        for (let vtx = 0; vtx < 4; vtx++) {
          const i = (f * 4 + vtx) * 3;
          colors[i] = Math.min(1, base.r * shade);
          colors[i + 1] = Math.min(1, base.g * shade);
          colors[i + 2] = Math.min(1, base.b * shade);
        }
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      mesh.userData.cell = [x, y, z];
      group.add(mesh);
    });
  }, [version]);

  // ----- import / export -----
  const exportOBJ = () => {
    const { obj, mtl } = toOBJMTL(voxelsRef.current);
    setExportData({
      files: [
        { name: "model.obj", text: obj },
        { name: "model.mtl", text: mtl },
      ],
      note: "Save BOTH files in the same folder — the .obj references the .mtl for colors.",
    });
  };
  const exportGLTF = () => {
    if (voxelsRef.current.size === 0) return;
    setExportData({
      files: [{ name: "model.gltf", text: toGLTF(voxelsRef.current) }],
      note:
        "Save as model.gltf (one self-contained file — mesh data is embedded). " +
        "Drag into Unity Assets with glTFast installed, or open in Blender / any glTF viewer.",
    });
  };
  const exportJSON = () => {
    const arr = [];
    voxelsRef.current.forEach((c, k) => {
      const [x, y, z] = k.split(",").map(Number);
      arr.push({ x, y, z, c });
    });
    setExportData({
      files: [
        {
          name: "model.json",
          text: JSON.stringify({ size: GRID, voxels: arr }),
        },
      ],
      note: "Save this file, then use Import to load it back later.",
    });
  };
  const copyFile = async (i) => {
    try {
      await navigator.clipboard.writeText(exportData.files[i].text);
      setCopied(i);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select-all in the textarea */
    }
  };
  const tryDownload = (i) =>
    download(exportData.files[i].name, exportData.files[i].text, "text/plain");
  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const m = new Map();
        for (const v of data.voxels || []) {
          if (v.x >= 0 && v.x < GRID && v.y >= 0 && v.y < GRID && v.z >= 0 && v.z < GRID)
            m.set(key(v.x, v.y, v.z), Math.min(PALETTE.length - 1, Math.max(0, v.c | 0)));
        }
        snapshot();
        voxelsRef.current = m;
        setVersion((n) => n + 1);
      } catch {
        /* ignore bad files */
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const count = voxelsRef.current.size;

  // ----- styles -----
  const S = {
    app: {
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#1a1d24", color: "#e8e6e0",
      fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
    },
    bar: {
      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
      background: "#232830", borderBottom: "2px solid #12141a", flexWrap: "wrap",
    },
    title: { fontSize: 14, fontWeight: 700, letterSpacing: 2, marginRight: "auto" },
    btn: (active) => ({
      padding: "8px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
      color: active ? "#12141a" : "#e8e6e0",
      background: active ? "#6abe30" : "#2c323d",
      border: "none", borderRadius: 2,
      boxShadow: active
        ? "inset -2px -2px 0 rgba(0,0,0,.35), inset 2px 2px 0 rgba(255,255,255,.35)"
        : "inset -2px -2px 0 rgba(0,0,0,.4), inset 2px 2px 0 rgba(255,255,255,.08)",
    }),
    canvas: { flex: 1, minHeight: 0, position: "relative" },
    hint: {
      position: "absolute", top: 10, left: 12, fontSize: 11, color: "#7d8698",
      pointerEvents: "none", lineHeight: 1.6,
    },
    footer: {
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: "#232830", borderTop: "2px solid #12141a", flexWrap: "wrap",
    },
    swatchRow: { display: "flex", gap: 6, overflowX: "auto", flex: 1, padding: "2px 0" },
    swatch: (hex, active) => ({
      width: 30, height: 30, flex: "0 0 auto", cursor: "pointer", background: hex,
      border: "none", borderRadius: 2,
      boxShadow: active
        ? "0 0 0 2px #e8e6e0, inset -3px -3px 0 rgba(0,0,0,.35), inset 3px 3px 0 rgba(255,255,255,.3)"
        : "inset -3px -3px 0 rgba(0,0,0,.35), inset 3px 3px 0 rgba(255,255,255,.3)",
    }),
  };

  return (
    <div style={S.app}>
      <div style={S.bar}>
        <span style={S.title}>BLOCKSMITH</span>
        <button style={S.btn(false)} onClick={undo} title="Undo">Undo</button>
        <button style={S.btn(false)} onClick={clearAll}>Clear</button>
        <button style={S.btn(false)} onClick={() => fileRef.current?.click()}>Import</button>
        <button style={S.btn(false)} onClick={exportJSON}>JSON</button>
        <button style={S.btn(false)} onClick={exportOBJ}>OBJ</button>
        <button style={S.btn(false)} onClick={exportGLTF}>glTF</button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={importJSON} />
      </div>

      <div style={S.canvas} ref={mountRef}>
        <div style={S.hint}>
          tap: use tool &nbsp;·&nbsp; drag: orbit &nbsp;·&nbsp; scroll / pinch: zoom
          <br />{count} blocks
        </div>
      </div>

      {exportData && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, padding: 16,
          }}
        >
          <div
            style={{
              background: "#232830", borderRadius: 4, padding: 14,
              width: "min(560px, 100%)", maxHeight: "85vh", overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 10,
              boxShadow: "0 8px 30px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ fontSize: 11, color: "#7d8698", lineHeight: 1.5 }}>
              {exportData.note} (Direct downloads are blocked inside this
              preview — use Copy and paste into a text file.)
            </div>
            {exportData.files.map((file, i) => (
              <div key={file.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, marginRight: "auto" }}>
                    {file.name}
                  </span>
                  <button style={S.btn(false)} onClick={() => tryDownload(i)}>
                    Download
                  </button>
                  <button style={S.btn(true)} onClick={() => copyFile(i)}>
                    {copied === i ? "Copied!" : "Copy"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={file.text}
                  onFocus={(e) => e.target.select()}
                  style={{
                    width: "100%", height: 110, resize: "none", fontSize: 10,
                    fontFamily: "inherit", background: "#1a1d24", color: "#e8e6e0",
                    border: "1px solid #12141a", borderRadius: 2, padding: 8,
                  }}
                />
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button style={S.btn(false)} onClick={() => setExportData(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.footer}>
        <button style={S.btn(tool === "place")} onClick={() => setTool("place")}>Place</button>
        <button style={S.btn(tool === "remove")} onClick={() => setTool("remove")}>Break</button>
        <button style={S.btn(tool === "paint")} onClick={() => setTool("paint")}>Paint</button>
        <div style={S.swatchRow}>
          {PALETTE.map((p, i) => (
            <button
              key={p.name}
              title={p.name}
              style={S.swatch(p.hex, i === color)}
              onClick={() => { setColor(i); if (tool === "remove") setTool("place"); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Voxel models for the Balloon Pop game, authored in the BlockSmith style
// (pure VoxelMap builders, same as src/core/templates.ts). Each model is 16^3,
// authored facing +x (the "front"), roughly centered on x=8 / z=8 and resting at
// y=0. The Unity loader (VoxelAssets.cs) re-centers from mesh bounds and scales
// to a target height, so exact centering here is not critical — silhouette is.
//
// Palette index reference (from src/core/shading.ts):
//   0 Grass  1 Leaves  2 Dirt   3 Oak    4 DarkOak 5 Stone  6 Cobble 7 Sand
//   8 Water  9 Snow   10 Red   11 Orange 12 Yellow 13 Purple 14 Pink 15 Coal

import type { VoxelMap } from "../../src/core/voxels";
import { key, inBounds } from "../../src/core/voxels";
import { starterTree, starterChest, starterHouse } from "../../src/core/templates";

// ---------------------------------------------------------------- helpers ---

/** Fill an inclusive box [x0..x1][y0..y1][z0..z1] with color c. */
function box(
  m: VoxelMap,
  x0: number, x1: number,
  y0: number, y1: number,
  z0: number, z1: number,
  c: number
): void {
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        if (inBounds(x, y, z)) m.set(key(x, y, z), c);
}

/** Set a single voxel (last write wins — detail over a base box). */
function put(m: VoxelMap, x: number, y: number, z: number, c: number): void {
  if (inBounds(x, y, z)) m.set(key(x, y, z), c);
}

/** Solid sphere of color c, radius r about (cx,cy,cz). */
function sphere(m: VoxelMap, cx: number, cy: number, cz: number, r: number, c: number): void {
  const r2 = r * r;
  const lo = Math.floor(-r), hi = Math.ceil(r);
  for (let dx = lo; dx <= hi; dx++)
    for (let dy = lo; dy <= hi; dy++)
      for (let dz = lo; dz <= hi; dz++)
        if (dx * dx + dy * dy + dz * dz <= r2) put(m, cx + dx, cy + dy, cz + dz, c);
}

// ---------------------------------------------------------- characters ---

// Mama Pig — chunky pink pig with a red hair bow, faces +x.
function mamaPig(): VoxelMap {
  const m: VoxelMap = new Map();
  const P = 14, DK = 15, RED = 10;
  box(m, 4, 9, 3, 6, 5, 10, P);          // body
  put(m, 5, 0, 6, P); put(m, 5, 1, 6, P); put(m, 5, 2, 6, P); // legs
  put(m, 5, 0, 9, P); put(m, 5, 1, 9, P); put(m, 5, 2, 9, P);
  put(m, 8, 0, 6, P); put(m, 8, 1, 6, P); put(m, 8, 2, 6, P);
  put(m, 8, 0, 9, P); put(m, 8, 1, 9, P); put(m, 8, 2, 9, P);
  box(m, 10, 12, 3, 6, 6, 9, P);         // head
  box(m, 13, 13, 4, 5, 7, 8, P);         // snout
  put(m, 13, 4, 7, DK); put(m, 13, 5, 8, DK); // nostrils
  put(m, 11, 7, 6, P); put(m, 11, 7, 9, P);   // ears
  put(m, 13, 6, 6, DK); put(m, 13, 6, 9, DK); // eyes
  // red bow on top of head
  put(m, 10, 7, 6, RED); put(m, 10, 7, 7, RED);
  put(m, 10, 7, 8, RED); put(m, 10, 7, 9, RED);
  put(m, 10, 8, 7, RED); put(m, 10, 8, 8, RED);
  put(m, 10, 7, 7, P);   // pink knot center-ish
  return m;
}

// Piglet — big-headed chibi pig (head ~2x body volume), dot eyes, square blush
// patches (spec §5). Faces +x.
function piglet(): VoxelMap {
  const m: VoxelMap = new Map();
  const P = 14, DK = 15, BL = 16;
  box(m, 6, 9, 1, 2, 6, 9, P);           // small body (4x2x4)
  put(m, 6, 0, 6, P); put(m, 9, 0, 6, P); // stubby legs
  put(m, 6, 0, 9, P); put(m, 9, 0, 9, P);
  box(m, 6, 9, 3, 6, 6, 9, P);           // BIG head (4x4x4 = 2x body)
  put(m, 6, 7, 7, P); put(m, 9, 7, 7, P); // ears
  box(m, 10, 10, 4, 5, 7, 8, P);         // snout
  put(m, 10, 4, 7, DK);                  // nostril
  put(m, 9, 5, 6, DK); put(m, 9, 5, 9, DK); // dot eyes flanking snout
  put(m, 9, 4, 6, BL); put(m, 9, 4, 9, BL); // square blush cheeks
  return m;
}

// Wolf — rounder, big-eared, worried-browed and mischievous (spec §5). Grey-lilac
// body, snow belly/muzzle, coal nose/ears/brows. Eyes are added as separate
// night-glowing objects in Unity (CharacterFactory.BuildWolf). Faces +x.
function wolf(): VoxelMap {
  const m: VoxelMap = new Map();
  const G = 5, DK = 15, SN = 9;
  box(m, 4, 10, 3, 6, 5, 10, G);         // chunky rounded body
  box(m, 5, 9, 3, 3, 6, 9, SN);          // belly
  put(m, 4, 6, 5, G); put(m, 10, 6, 5, G); // round shoulders/haunch
  put(m, 4, 6, 10, G); put(m, 10, 6, 10, G);
  put(m, 5, 0, 6, G); put(m, 5, 1, 6, G); put(m, 5, 2, 6, G); // legs
  put(m, 5, 0, 9, G); put(m, 5, 1, 9, G); put(m, 5, 2, 9, G);
  put(m, 9, 0, 6, G); put(m, 9, 1, 6, G); put(m, 9, 2, 6, G);
  put(m, 9, 0, 9, G); put(m, 9, 1, 9, G); put(m, 9, 2, 9, G);
  box(m, 10, 13, 4, 8, 6, 9, G);         // big head
  box(m, 14, 14, 5, 6, 7, 8, SN);        // muzzle
  put(m, 14, 5, 7, DK); put(m, 14, 6, 8, DK); // nose
  box(m, 10, 11, 9, 10, 5, 6, DK);       // big left ear
  box(m, 10, 11, 9, 10, 9, 10, DK);      // big right ear
  put(m, 13, 8, 6, DK); put(m, 13, 8, 9, DK); // worried brows (above eyes)
  box(m, 2, 3, 5, 6, 7, 8, G);           // tail
  return m;
}

// ------------------------------------------------------------- balloon ---

// Balloon — near-white so the game can tint it per-instance. Full-height
// teardrop built from circular slices: rounded cap, widest just above the
// middle, stepped taper down to a tiny knot (classic voxel balloon). Voxels
// pick between three near-white shades via a deterministic hash so each
// block reads distinct once tinted (red balloon = shades of red).
function balloon(): VoxelMap {
  const m: VoxelMap = new Map();
  const SHADES = [9, 9, 17, 17, 18]; // white x2, dim x2, dimmer x1
  const pick = (x: number, y: number, z: number): number => {
    let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
    h = (h ^ (h >> 13)) >>> 0;
    return SHADES[h % SHADES.length];
  };
  // Radius per row, bottom (y=2) to top (y=15). Knot sits at y=0..1.
  const profile: [number, number][] = [
    [2, 1.5], [3, 2.5], [4, 3.5], [5, 4.5], [6, 5.2], [7, 5.8],
    [8, 6.2], [9, 6.5], [10, 6.6], [11, 6.5], [12, 6.1], [13, 5.4],
    [14, 4.3], [15, 2.8],
  ];
  for (const [y, r] of profile) {
    const r2 = r * r;
    const hi = Math.ceil(r);
    for (let dx = -hi; dx <= hi; dx++)
      for (let dz = -hi; dz <= hi; dz++)
        if (dx * dx + dz * dz <= r2)
          put(m, 8 + dx, y, 8 + dz, pick(8 + dx, y, 8 + dz));
  }
  put(m, 8, 1, 8, pick(8, 1, 8)); put(m, 8, 0, 8, pick(8, 0, 8)); // knot
  return m;
}

// ------------------------------------------------------------ power-ups ---

// Triple Bubbles — cluster of three pink blobs.
function powerupTriple(): VoxelMap {
  const m: VoxelMap = new Map();
  sphere(m, 8, 9, 8, 2.2, 14);
  sphere(m, 6, 6, 8, 1.7, 14);
  sphere(m, 10, 6, 8, 1.7, 14);
  return m;
}

// Slow Breeze — pale-blue snowflake in the x/y plane.
function powerupSlow(): VoxelMap {
  const m: VoxelMap = new Map();
  const B = 8, SN = 9;
  for (let d = -4; d <= 4; d++) {
    put(m, 8 + d, 8, 8, B); // horizontal
    put(m, 8, 8 + d, 8, B); // vertical
    put(m, 8 + d, 8 + d, 8, B); // diagonals
    put(m, 8 + d, 8 - d, 8, B);
  }
  sphere(m, 8, 8, 8, 1.4, SN); // bright core
  return m;
}

// Sunshine — glowing yellow sun with orange rays.
function powerupSunshine(): VoxelMap {
  const m: VoxelMap = new Map();
  const Y = 12, O = 11;
  sphere(m, 8, 8, 8, 2.6, Y);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rx = Math.round(8 + Math.cos(a) * 4);
    const ry = Math.round(8 + Math.sin(a) * 4);
    put(m, rx, ry, 8, O);
  }
  return m;
}

// --------------------------------------------------------------- props ---

// Bush — low leafy mound.
function bush(): VoxelMap {
  const m: VoxelMap = new Map();
  sphere(m, 8, 2, 8, 2.6, 1);
  sphere(m, 6, 2, 9, 1.8, 1);
  sphere(m, 10, 2, 7, 1.8, 1);
  return m;
}

// Flower — leaf stem, pink petals, yellow center.
function flower(): VoxelMap {
  const m: VoxelMap = new Map();
  box(m, 8, 8, 0, 3, 8, 8, 1);           // stem
  const P = 14, Y = 12;
  put(m, 8, 4, 8, Y);                    // center
  put(m, 7, 4, 8, P); put(m, 9, 4, 8, P);
  put(m, 8, 4, 7, P); put(m, 8, 4, 9, P);
  put(m, 8, 5, 8, P); put(m, 8, 3, 8, P);
  return m;
}

// Cloud — wide flat white puff.
function cloud(): VoxelMap {
  const m: VoxelMap = new Map();
  const W = 9;
  sphere(m, 6, 8, 8, 2.6, W);
  sphere(m, 9, 8, 8, 3.0, W);
  sphere(m, 12, 8, 8, 2.3, W);
  sphere(m, 8, 7, 8, 2.4, W);
  return m;
}

// Lift basket — chunky rustic gondola for Mama Pig's lift. Oak plank floor
// with dark plank strips, dark corner posts, and asymmetric rails: full-height
// back/far walls, a low camera-side wall (pig stays visible) and an open
// shooting front. glTFast mirrors x on import (authored +x renders at world
// -x, same as the wolf/pig), so the open front is authored at +x to face the
// wolves (-x) in game at yaw 0.
function liftBasket(): VoxelMap {
  const m: VoxelMap = new Map();
  const OAK = 3, DK = 4;
  box(m, 2, 13, 0, 1, 4, 12, OAK);       // plank floor
  box(m, 5, 5, 0, 1, 4, 12, DK);         // dark plank strips
  box(m, 10, 10, 0, 1, 4, 12, DK);
  for (const [px, pz] of [[2, 4], [2, 12], [13, 4], [13, 12]] as const)
    box(m, px, px, 0, 6, pz, pz, DK);    // corner posts
  box(m, 2, 2, 2, 4, 4, 12, OAK);        // back wall (authored -x -> world +x)
  box(m, 2, 2, 5, 5, 4, 12, DK);         // back top rail
  box(m, 2, 13, 2, 4, 12, 12, OAK);      // far wall (+z)
  box(m, 2, 13, 5, 5, 12, 12, DK);       // far top rail
  box(m, 2, 13, 2, 3, 4, 4, OAK);        // camera wall (-z), low
  box(m, 13, 13, 2, 2, 4, 12, OAK);      // shooting side (authored +x -> world -x), lowest
  return m;
}

// Acorn — slingshot ammo. Squashed oak body, dark cap and 1-voxel stem.
function acorn(): VoxelMap {
  const m: VoxelMap = new Map();
  sphere(m, 8, 3, 8, 3, 3);              // oak body
  box(m, 5, 11, 5, 7, 5, 11, 4);         // dark cap
  put(m, 8, 8, 8, 4);                    // stem
  return m;
}

// Sun — bright yellow ball with a few orange flecks.
function sun(): VoxelMap {
  const m: VoxelMap = new Map();
  sphere(m, 8, 8, 8, 4.2, 12);
  put(m, 4, 8, 8, 11); put(m, 12, 8, 8, 11);
  put(m, 8, 4, 8, 11); put(m, 8, 12, 8, 11);
  return m;
}

// ---------------------------------------------------------------- registry ---

export interface GameModel {
  name: string;
  build: () => VoxelMap;
}

export const GAME_MODELS: GameModel[] = [
  { name: "mama_pig", build: mamaPig },
  { name: "piglet", build: piglet },
  { name: "wolf", build: wolf },
  { name: "balloon", build: balloon },
  { name: "powerup_triple", build: powerupTriple },
  { name: "powerup_slow", build: powerupSlow },
  { name: "powerup_sunshine", build: powerupSunshine },
  { name: "tree", build: starterTree },
  { name: "bush", build: bush },
  { name: "flower", build: flower },
  { name: "cottage", build: starterHouse },
  { name: "chest", build: starterChest },
  { name: "cloud", build: cloud },
  { name: "sun", build: sun },
  { name: "lift_basket", build: liftBasket },
  { name: "acorn", build: acorn },
];

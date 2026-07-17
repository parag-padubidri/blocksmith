// Starter models — the app never opens to an empty grid, and the empty-state
// screen offers these five to rebuild from.

import type { VoxelMap } from "./voxels";
import { key } from "./voxels";

export function starterTree(): VoxelMap {
  const m: VoxelMap = new Map();
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

export function starterSword(): VoxelMap {
  const m: VoxelMap = new Map();
  m.set(key(8, 0, 8), 12); // pommel
  m.set(key(8, 1, 8), 4); // handle
  m.set(key(8, 2, 8), 4);
  for (let x = 6; x <= 10; x++) m.set(key(x, 3, 8), 12); // gold guard
  for (let y = 4; y <= 12; y++) m.set(key(8, y, 8), 9); // snow-bright blade
  m.set(key(8, 13, 8), 5); // stone tip
  return m;
}

export function starterChest(): VoxelMap {
  const m: VoxelMap = new Map();
  for (let x = 4; x <= 11; x++)
    for (let z = 5; z <= 10; z++) {
      for (let y = 0; y <= 2; y++) m.set(key(x, y, z), 3); // oak body
      m.set(key(x, 3, z), 4); // dark oak lid
    }
  m.set(key(7, 2, 10), 12); // gold latch, front center
  m.set(key(8, 2, 10), 12);
  return m;
}

export function starterCharacter(): VoxelMap {
  const m: VoxelMap = new Map();
  for (const x of [7, 8]) {
    for (let y = 0; y <= 2; y++) m.set(key(x, y, 8), 8); // blue legs
    for (let y = 3; y <= 5; y++) m.set(key(x, y, 8), 10); // red shirt
  }
  for (const x of [6, 9]) {
    m.set(key(x, 5, 8), 10); // sleeves
    m.set(key(x, 4, 8), 7); // skin arms
    m.set(key(x, 3, 8), 7);
  }
  for (const x of [7, 8])
    for (const z of [7, 8]) {
      m.set(key(x, 6, z), 7); // head
      m.set(key(x, 7, z), 7);
      m.set(key(x, 8, z), 4); // hair
    }
  return m;
}

export function starterHouse(): VoxelMap {
  const m: VoxelMap = new Map();
  for (let x = 4; x <= 11; x++)
    for (let z = 4; z <= 11; z++) {
      const wall = x === 4 || x === 11 || z === 4 || z === 11;
      if (!wall) continue;
      const corner = (x === 4 || x === 11) && (z === 4 || z === 11);
      for (let y = 0; y <= 3; y++) m.set(key(x, y, z), corner ? 6 : 3);
    }
  // door opening, front wall
  for (const x of [7, 8]) for (let y = 0; y <= 2; y++) m.delete(key(x, y, 11));
  // water-glass windows
  m.set(key(5, 2, 11), 8);
  m.set(key(10, 2, 11), 8);
  m.set(key(4, 2, 7), 8);
  m.set(key(4, 2, 8), 8);
  m.set(key(11, 2, 7), 8);
  m.set(key(11, 2, 8), 8);
  // red pyramid roof
  for (let level = 0; level <= 3; level++)
    for (let x = 4 + level; x <= 11 - level; x++)
      for (let z = 4 + level; z <= 11 - level; z++)
        m.set(key(x, 4 + level, z), 10);
  return m;
}

export interface Template {
  id: string;
  name: string;
  build: () => VoxelMap;
}

export const TEMPLATES: Template[] = [
  { id: "tree", name: "Tree", build: starterTree },
  { id: "sword", name: "Sword", build: starterSword },
  { id: "chest", name: "Chest", build: starterChest },
  { id: "character", name: "Character", build: starterCharacter },
  { id: "house", name: "House", build: starterHouse },
];

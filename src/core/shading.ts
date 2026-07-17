// Palette + Minecraft-look shading math. Pure functions, no DOM/Three.

export interface PaletteEntry {
  name: string;
  hex: string;
}

export const PALETTE: readonly PaletteEntry[] = [
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

// Directional shade per box face: +x, -x, +y, -y, +z, -z
export const FACE_SHADE: readonly number[] = [0.8, 0.8, 1.0, 0.5, 0.65, 0.65];

// Deterministic per-face grain so mesh rebuilds don't flicker.
// Seeded from position + face index, never Math.random().
export function grain(x: number, y: number, z: number, f: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + f * 4.171) * 43758.5453;
  return (s - Math.floor(s)) * 0.12 - 0.06; // -0.06 .. +0.06
}

// glTF COLOR_0 (and three's working color space) is linear; palette hexes are sRGB.
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export type RGB = [number, number, number];

// "#6abe30" -> sRGB floats 0..1
export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// Shaded face color in sRGB space (shade + optional grain applied to sRGB values,
// matching the validated prototype look).
export function shadedFaceColor(
  base: RGB,
  x: number,
  y: number,
  z: number,
  face: number,
  withGrain = true
): RGB {
  const s = FACE_SHADE[face] + (withGrain ? grain(x, y, z, face) : 0);
  return [Math.min(1, base[0] * s), Math.min(1, base[1] * s), Math.min(1, base[2] * s)];
}

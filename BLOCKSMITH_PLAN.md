# Blocksmith — Implementation Plan

Handoff document for Claude Code. Build a novice-friendly, Minecraft-style voxel asset editor as a standalone, backend-free web app (PWA). A validated prototype exists (`voxel_editor.jsx`, included in this repo) — the interaction model, shading math, and all three exporters have been tested end-to-end, including a successful glTF → glTFast → Unity import. Port its logic; do not redesign what already works.

## Product summary

- **What**: browser-based 16³ voxel editor producing Minecraft-look assets
- **Who**: novices — people who bounce off MagicaVoxel. Every UI decision favors fewer controls
- **Platform**: static site (Vite build), PWA-installable, touch-first (must be excellent on iPhone), works offline, zero backend, zero accounts
- **Out of scope (do not build)**: animation/rigging, texture painting, grids >16³, multiplayer, AI generation (deferred to a later evaluation), accounts/cloud sync

## Validated decisions — treat as fixed

These were tested in the prototype and confirmed working. Do not revisit without a strong reason.

1. **Voxel state**: `Map<"x,y,z", paletteIndex>`, 16³ bounds, 16-color fixed palette (hex values in prototype).
2. **Minecraft look**: unlit rendering + per-face directional shade `[+x 0.8, −x 0.8, +y 1.0, −y 0.5, +z 0.65, −z 0.65]` + deterministic per-face grain noise (`sin`-hash of `(x,y,z,faceIndex)`, ±0.06). Grain must be seeded from position, never `Math.random()`, so rebuilds don't flicker.
3. **Interaction**: tap = apply tool, drag (>6px) = orbit, pinch/scroll = zoom. Tools: Place / Break / Paint. Place raycasts against voxel faces + invisible ground plane, offsets by hit-face normal.
4. **Undo**: snapshot stack of full Map copies, capped at 60. Cheap at this scale — do not build a command pattern.
5. **Exports** (all three, logic already written in prototype):
   - **glTF** (primary): `COLOR_0` vertex colors, `KHR_materials_unlit`, sRGB→linear conversion, interior-face culling, 4-byte-aligned buffer. Verified in Unity via glTFast.
   - **OBJ + MTL** (compatibility): one material per color×direction (`c{i}_d{j}`), shade baked into `Kd`, `illum 0`. Grain is lost here by format limitation — acceptable, documented.
   - **JSON** (native save format): `{ size: 16, voxels: [{x,y,z,c}] }`.
6. **Starter content**: app never opens to an empty grid — load a starter model (tree) or last session.
7. **LLM-generated models via JSON import**: the JSON format doubles as an AI entry point with zero backend — users ask any LLM (Claude, etc.) to generate model JSON, paste it in, and export. Confirmed working in the prototype. Requirements this imposes: keep the schema stable and trivially simple; import must be lenient (clamp/skip out-of-bounds voxels and invalid color indices rather than reject); import must accept **pasted text**, not just files (this workflow is copy-paste-shaped, especially on mobile); document the schema + palette table in-app (a "Generate with AI" help screen showing the schema and a ready-to-copy prompt template, e.g. "Generate blocksmith JSON for a small sailboat. Format: {size:16, voxels:[{x,y,z,c}]}, coords 0–15, y up, c is palette index: 0 Grass #6abe30, 1 Leaves …"). This is the MVP's answer to AI generation; the deferred item below refers only to *in-app* generation.

## Known pitfalls (already hit once — don't hit them again)

- OBJ vertex colors are non-standard; Unity and most web viewers silently drop them. That's why OBJ export uses MTL materials instead.
- glTF `COLOR_0` is linear color space; palette hexes are sRGB. Convert (`c≤0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`) or Unity renders washed out.
- Keep faces unwelded (4 verts per face, no sharing) — vertex sharing breaks both flat shading and per-face color.
- In the real build, replace the prototype's copy-paste export modal with direct blob downloads (`URL.createObjectURL` + anchor click) — the modal only existed because the Claude artifact sandbox blocks downloads. Prefer `.glb` binary over `.gltf`+base64 now that real downloads work.

## Tech stack

- Vite + React + TypeScript (convert prototype's plain JS; type the voxel map, palette, exporters)
- Three.js (current version) for viewport; use its `GLTFExporter` **replacing** the hand-rolled one — but keep the hand-rolled exporter's mesh-building function (culling + shading + grain) as the geometry source
- `lz-string` for URL sharing; `idb-keyval` (or thin IndexedDB wrapper) for local library
- `vite-plugin-pwa` for manifest + service worker
- Vitest for unit tests
- No UI framework/Tailwind needed — the prototype's styling approach is fine; extract to CSS modules

## Suggested structure

```
src/
  core/            # pure logic, no DOM/Three — fully unit-testable
    voxels.ts      # Map ops, bounds, neighbors, serialize/deserialize
    shading.ts     # FACE_SHADE, grain(), palette, srgbToLinear
    meshBuild.ts   # voxels -> positions/colors/indices (culled, unwelded)
    exporters/     # objMtl.ts, json.ts, gltf.ts (wraps GLTFExporter)
    urlCodec.ts    # voxels <-> lz-string URL fragment
  three/           # scene, camera/orbit, raycasting, mesh sync
  ui/              # React components: toolbar, palette, library, modals
  storage/         # IndexedDB library, autosave
```

## Milestones

### M1 — Port the prototype (parity)
Port `voxel_editor.jsx` into the structure above. Same features, same feel, TypeScript, real blob downloads for all exports, `.glb` via `GLTFExporter` (`MeshBasicMaterial` + vertex colors ⇒ exporter emits `KHR_materials_unlit` automatically — verify this in output).
**Accept when**: feature parity with prototype; exported `.glb` passes the Khronos glTF validator with zero errors; OBJ+MTL opens colored in MeshLab; touch interaction works on iOS Safari.

### M2 — Persistence & sharing
Autosave current model to IndexedDB on every edit (debounced); restore on load. Library screen: saved models with thumbnails (render to offscreen canvas), rename, duplicate, delete. URL sharing: encode model with lz-string into `#` fragment; opening a share link loads it. JSON import/export retained, with import accepting both file upload and pasted text; add the "Generate with AI" help screen (schema + palette table + copyable prompt template per Validated decision 7).
**Accept when**: refresh restores work-in-progress; share link round-trips a 500-voxel model; library handles 50+ models without jank; JSON produced by an LLM from the in-app prompt template imports successfully via paste.

### M3 — Novice-friendliness (the actual product)
- Ghost preview: translucent voxel showing where Place will land, updated on hover/pointer-move
- Mirror mode: X-axis symmetry toggle applying every place/break/paint across the plane
- 5 starter templates (tree, sword, chest, character, house) selectable from an empty-state screen
- Onboarding: 3-step first-run overlay (tap to place / drag to orbit / pick colors), dismissible, never shown again
- PWA: installable, offline-capable, iOS meta tags, app icon
**Accept when**: a first-time user can produce and export a recognizable object in under 2 minutes without instructions (hallway-test with someone).

### M4 — Polish & ship
Turntable PNG export (render N frames to canvas, or single hero shot at 2× resolution). Keyboard shortcuts (1/2/3 tools, Ctrl+Z). Reduced-motion respected, focus states, basic a11y pass. Deploy to static host (GitHub Pages or Cloudflare Pages) with CI.
**Accept when**: Lighthouse PWA + a11y ≥ 90; deployed URL works installed-offline on iPhone.

## Testing priorities

Unit-test `core/` hard, UI lightly:
- meshBuild: face counts with culling (2 stacked voxels ⇒ 10 faces, 40 verts, 60 indices), index bounds, unwelded verts
- shading: grain determinism (same input ⇒ same output), shade table applied per face
- exporters: glTF validates (run validator in CI if feasible), OBJ face/vert counts, JSON round-trip identity
- urlCodec: round-trip identity, graceful failure on garbage input

## Deferred / later evaluation

- In-app AI generation (app calls an LLM directly) — revisit after M4 based on demand; needs a backend or BYO-key, both conflict with the zero-backend principle. The paste-JSON workflow (Validated decision 7) covers this need in the MVP.
- Larger grids (needs greedy meshing + instancing — explicitly out of MVP)
- Community gallery (needs backend; URL sharing is the MVP substitute)
- Monetization experiments (HD renders, template packs) — only after real usage exists

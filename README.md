# Blocksmith

A friendly, Minecraft-style voxel editor for people who bounce off MagicaVoxel.
Build 16³ block models in the browser, then export them as `.glb`, `.obj`+`.mtl`,
JSON, or a PNG snapshot. Works offline as an installable PWA, touch-first, zero
backend, zero accounts.

## Features

- **Three tools, one grid**: Place / Break / Paint on a 16³ grid with a fixed
  16-color palette. Tap to use the tool, drag to orbit, pinch or scroll to zoom.
- **Minecraft look**: unlit rendering with per-face directional shading and
  deterministic per-face grain.
- **Ghost preview** of where the next block lands, and **mirror mode** for
  symmetric builds.
- **Autosave + library**: every edit is saved locally (IndexedDB); keep multiple
  models with thumbnails, rename/duplicate/delete.
- **Share links**: models compress into the URL fragment — no server involved.
- **Generate with AI**: paste model JSON from any LLM chatbot; the in-app help
  screen has a ready-to-copy prompt template and the palette table.
- **Exports**: `.glb` (vertex colors, `KHR_materials_unlit` — verified with
  Unity/glTFast), `.obj`+`.mtl` (colors baked into materials), native JSON, and
  2× PNG snapshots.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # vitest unit tests (core logic)
npm run build    # type-check + production build (PWA)
```

App icons are generated, not drawn: `node scripts/gen-icons.mjs`.

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| 1 / 2 / 3 | Place / Break / Paint |
| M | Toggle mirror mode |
| Ctrl+Z | Undo |

## Model JSON format

```json
{ "size": 16, "voxels": [ { "x": 8, "y": 0, "z": 8, "c": 0 } ] }
```

`x`/`y`/`z` are integers 0–15 (y is up), `c` is a palette index (0–15). Import
is lenient: out-of-bounds voxels are skipped and invalid color indices clamped.

## Deployment

Pushes to `master` run tests, build, and deploy to GitHub Pages via
`.github/workflows/deploy.yml` (enable **Settings → Pages → GitHub Actions**
in the repo). The build is a fully static site — any static host works.

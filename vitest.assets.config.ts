// Separate vitest config for generating Balloon Pop game assets. Kept apart from
// the app suite (vite.config.ts, include: src/**/*.test.ts) so `npm test` never
// regenerates assets. Run with:
//   npx vitest run --config vitest.assets.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/gameAssets/**/*.gen.ts", "scripts/gameAssets/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
  },
});

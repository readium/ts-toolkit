import { resolve } from "path";
import { defineConfig, defaultClientConditions } from "vite";

// Serves the test pages against the workspace sources, so no package needs building first.
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    conditions: ["ts-toolkit-source", ...defaultClientConditions],
  },
  server: {
    port: 5180,
    strictPort: true,
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        grid: resolve(import.meta.dirname, "grid.html"),
      },
    },
  },
});

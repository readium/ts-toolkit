import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        shared: resolve(__dirname, "src/index.ts"),
        fetcher: resolve(__dirname, "src/fetcher/index.ts")
      }
    }
  }
});
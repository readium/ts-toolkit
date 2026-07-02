import { resolve } from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  build: {
    rollupOptions: {
      input: resolve(__dirname, "src/index.ts"),
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        preserveModules: true,
        preserveModulesRoot: resolve(__dirname, "src"),
        dir: "dist",
        entryFileNames: "[name].js",
      }
    }
  },
  define: {
    "import.meta.env.PACKAGE_NAME": JSON.stringify(packageJson.name),
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(packageJson.version),
  }
});

import { resolve } from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "shared",
      fileName: "index"
    }
  },
  define: {
    "import.meta.env.PACKAGE_NAME": JSON.stringify(packageJson.name),
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(packageJson.version),
  }
});
import { resolve } from "path";
import { defineConfig } from "vite";
import libAssetsPlugin from "@laynezh/vite-plugin-lib-assets";
import packageJson from "./package.json";

export default defineConfig({
  plugins: [
    libAssetsPlugin({
      extensions: [".jpg", ".png", ".svg", ".otf", ".ttf", ".woff", ".woff2"],
      name: "[name].[ext]"
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "navigator",
      fileName: "index"
    }
  },
  define: {
    "import.meta.env.PACKAGE_NAME": JSON.stringify(packageJson.name),
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      // Treat both packages as internal source code to eliminate duplication
      "@readium/navigator-html-injectables": resolve(__dirname, "../navigator-html-injectables/src"),
      "@readium/shared": resolve(__dirname, "../shared/src")
    }
  }
});
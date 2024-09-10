import { resolve } from "path";
import { defineConfig } from "vite";
import libAssetsPlugin from "@laynezh/vite-plugin-lib-assets";

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
  }
});
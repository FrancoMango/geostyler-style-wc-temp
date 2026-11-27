import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// TODO: https://vite.dev/guide/build#library-mode
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    cssInjectedByJs({
      jsAssetsFilterFunction: (chunk) =>
        chunk.fileName === 'index.js' ||
        chunk.fileName === 'geostyler-web-component.js',
    }),
    dts({ tsconfigPath: "./tsconfig.lib.json" }),
  ],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        "geostyler-web-component": "src/geostyler-web-component.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

function copyManifest() {
  return {
    name: "copy-extension-manifest",
    closeBundle() {
      copyFileSync(resolve(__dirname, "manifest.json"), resolve(__dirname, "dist/manifest.json"));
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [react(), tailwindcss(), tsconfigPaths(), copyManifest()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      // Em dev (npm run build:dev): sourcemaps inline + sem minificação
      // → erros no Chrome apontam para o TypeScript original, não para "line 1"
      // Em produção (npm run build): sem sourcemap, minificado com esbuild
      sourcemap: isDev ? "inline" : false,
      minify: isDev ? false : "esbuild",
      rollupOptions: {
        input: {
          "sidepanel/index": resolve(__dirname, "sidepanel/index.html"),
          "background/service-worker": resolve(__dirname, "src/background/service-worker.ts"),
          "content/whatsapp-detector": resolve(__dirname, "src/content/whatsapp-detector.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});

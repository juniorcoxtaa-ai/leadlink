// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";

const dbClientStub = fileURLToPath(new URL("./src/db/client-stub.ts", import.meta.url));
const dbIndex = fileURLToPath(new URL("./src/db/index.ts", import.meta.url));

function serverOnlyClientStubs() {
  return {
    name: "leadlink-server-only-client-stubs",
    enforce: "pre" as const,
    resolveId(source: string, _importer: string | undefined, options: { ssr?: boolean } = {}) {
      if (options.ssr) return null;
      if (source === "@/db") return dbClientStub;
      return null;
    },
    load(this: { environment?: { name?: string } }, id: string) {
      if (this.environment?.name !== "client") return null;
      if (id.replace(/\\/g, "/") !== dbIndex.replace(/\\/g, "/")) return null;
      return `export { db } from ${JSON.stringify(dbClientStub)};`;
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  cloudflare: false,
  vite: {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  },
  plugins: [nitro(), serverOnlyClientStubs()],
  tanstackStart: {
    server: { entry: "server" },
  },
});

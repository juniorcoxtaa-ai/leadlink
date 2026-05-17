import { fileURLToPath, pathToFileURL } from "node:url";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

process.env.NODE_ENV = "production";
process.env.BABEL_ENV = "production";

const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const mode = process.env.MODE || "production";

process.argv = [process.execPath, viteBin, "build", "--mode", mode];

await import(pathToFileURL(viteBin).href);

const serverOutputDir = fileURLToPath(new URL("../.output/server", import.meta.url));
const forbiddenDevRuntimePatterns = ["jsxDEV", "jsx-dev-runtime"];

async function* walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkFiles(path);
    } else {
      yield path;
    }
  }
}

for await (const file of walkFiles(serverOutputDir)) {
  if (!file.endsWith(".mjs") && !file.endsWith(".js")) continue;

  const contents = await readFile(file, "utf8");
  const match = forbiddenDevRuntimePatterns.find((pattern) => contents.includes(pattern));

  if (match) {
    throw new Error(`Production SSR bundle contains React development JSX runtime (${match}) in ${file}`);
  }
}

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "production";
process.env.BABEL_ENV = "production";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const mode = process.env.MODE || "production";

const build = spawnSync(process.execPath, [viteBin, "build", "--mode", mode], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    BABEL_ENV: "production",
  },
  stdio: "inherit",
});

if (build.error) {
  throw build.error;
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const serverOutputDir = fileURLToPath(new URL("../.output/server", import.meta.url));
const forbiddenDevRuntimePatterns = ["jsxDEV", "jsx-dev-runtime"];
const expectedOutputs = [
  ".output",
  ".output/server",
  ".output/server/index.mjs",
  ".output/public",
  ".output/nitro.json",
  "dist",
  "build",
  ".nitro",
  "node_modules/.nitro/vite/services/ssr",
];

function describePath(path) {
  const fullPath = join(projectRoot, path);

  if (!existsSync(fullPath)) {
    return `- ${path}: missing`;
  }

  const stats = statSync(fullPath);

  if (!stats.isDirectory()) {
    return `- ${path}: file (${stats.size} bytes)`;
  }

  const children = readdirSync(fullPath).slice(0, 20);
  const suffix = children.length ? ` -> ${children.join(", ")}` : " -> empty";

  return `- ${path}: directory${suffix}`;
}

async function* walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkFiles(path);
    } else {
      yield path;
    }
  }
}

if (!existsSync(serverOutputDir)) {
  const outputReport = expectedOutputs.map(describePath).join("\n");

  throw new Error(
    [
      "Production build finished, but TanStack Start/Nitro did not generate the expected SSR output at .output/server.",
      "This project is configured for TanStack Start + Nitro node-server output, so the expected runtime entry is .output/server/index.mjs.",
      "Generated output paths:",
      outputReport,
    ].join("\n"),
  );
}

for await (const file of walkFiles(serverOutputDir)) {
  if (!file.endsWith(".mjs") && !file.endsWith(".js")) continue;

  const contents = readFileSync(file, "utf8");
  const match = forbiddenDevRuntimePatterns.find((pattern) => contents.includes(pattern));

  if (match) {
    throw new Error(
      `Production SSR bundle contains React development JSX runtime (${match}) in ${relative(projectRoot, file)}`,
    );
  }
}

console.log("Production SSR bundle OK: .output/server exists and contains no jsxDEV/jsx-dev-runtime.");

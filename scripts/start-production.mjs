process.env.NODE_ENV = "production";
process.env.BABEL_ENV = "production";

await import("../.output/server/index.mjs");

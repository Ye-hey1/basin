import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["src/main/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist/main.cjs",
    external: ["electron"],
    target: "node20",
    sourcemap: "inline",
  }),
  build({
    entryPoints: ["src/preload/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist/preload.cjs",
    external: ["electron"],
    target: "node20",
  }),
]);

console.log("[desktop] bundled main.cjs + preload.cjs");

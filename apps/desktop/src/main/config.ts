import { resolve } from "node:path";

// Desktop shell configuration. Everything is env-overridable so the shell can
// be pointed at any running basin instance without a rebuild.
export const APP_PROTOCOL = "basin";

export const config = {
  // "external": connect to an already-running stack (dev default — the
  // start-basin.sh stack). "child": spawn apps/api as a Node child of
  // Electron (ELECTRON_RUN_AS_NODE), for self-contained runs.
  mode: (process.env.BASIN_DESKTOP_MODE === "child" ? "child" : "external") as
    | "external"
    | "child",
  apiUrl: (
    process.env.BASIN_DESKTOP_API_URL || "http://localhost:1337"
  ).replace(/\/+$/, ""),
  rendererUrl: (
    process.env.BASIN_DESKTOP_RENDERER_URL || "http://localhost:5174"
  ).replace(/\/+$/, ""),
  // Serve the built web bundle through the basin:// protocol instead of the
  // Vite dev server. Auto-enabled for packaged builds.
  forceAppProtocol: process.env.BASIN_DESKTOP_APP_PROTOCOL === "1",
  repoRoot: resolve(__dirname, "../../.."),
  get webDist(): string {
    return resolve(this.repoRoot, "apps/web/dist");
  },
  get apiDir(): string {
    return resolve(this.repoRoot, "apps/api");
  },
};

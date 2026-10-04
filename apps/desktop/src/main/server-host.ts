import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config";

export type ServerHost = {
  mode: "external" | "child";
  baseUrl: string;
  waitForHealthy(timeoutMs?: number): Promise<void>;
  stop(): void;
};

async function isHealthy(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      return false;
    }
    const body = (await response.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  }
}

function pollUntilHealthy(baseUrl: string, timeoutMs: number) {
  const started = Date.now();
  return new Promise<void>((resolvePromise, reject) => {
    const tick = async () => {
      if (await isHealthy(baseUrl)) {
        resolvePromise();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(
          new Error(
            `basin API did not become healthy at ${baseUrl} within ${Math.round(timeoutMs / 1000)}s`,
          ),
        );
        return;
      }
      setTimeout(tick, 600);
    };
    void tick();
  });
}

// Child mode: run apps/api with Electron's own binary acting as plain Node
// (ELECTRON_RUN_AS_NODE), the same trick rowboat uses — no bundled Node
// runtime needed. Dev resolves through tsx; packaged builds use the esbuild
// bundle once the packaging milestone lands.
function spawnApiChild(): ChildProcess {
  const apiDir = config.apiDir;
  const distEntry = resolve(apiDir, "dist/index.js");
  const tsxBin = resolve(apiDir, "node_modules/.bin/tsx");

  const command = existsSync(distEntry) ? distEntry : tsxBin;
  const args = existsSync(distEntry) ? [] : ["src/index.ts"];

  console.log(
    `[desktop] spawning basin API child: ${command} ${args.join(" ")}`,
  );
  const child = spawn(command, args, {
    cwd: apiDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code) => {
    console.error(`[desktop] basin API child exited with code ${code}`);
  });
  return child;
}

export function startServerHost(): ServerHost {
  if (config.mode === "child") {
    const child = spawnApiChild();
    return {
      mode: "child",
      baseUrl: config.apiUrl,
      waitForHealthy: (timeoutMs = 60_000) =>
        pollUntilHealthy(config.apiUrl, timeoutMs),
      stop: () => {
        child.kill();
      },
    };
  }

  return {
    mode: "external",
    baseUrl: config.apiUrl,
    waitForHealthy: (timeoutMs = 60_000) =>
      pollUntilHealthy(config.apiUrl, timeoutMs),
    stop: () => {},
  };
}

// Watchdog for the connecting screen: resolves once healthy, rejects on the
// next failure, so main.ts can flip the window between app and splash.
export function watchHealth(
  baseUrl: string,
  onHealthy: () => void,
  onUnhealthy: (error: Error) => void,
): () => void {
  let healthy = false;
  let stopped = false;
  const timer = setInterval(async () => {
    if (stopped) return;
    const ok = await isHealthy(baseUrl);
    if (ok && !healthy) {
      healthy = true;
      onHealthy();
    } else if (!ok && healthy) {
      healthy = false;
      onUnhealthy(new Error("basin API is unreachable"));
    }
  }, 3000);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

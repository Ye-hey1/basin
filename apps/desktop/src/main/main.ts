import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  protocol,
} from "electron";
import { APP_PROTOCOL, config } from "./config";
import { type ServerHost, startServerHost, watchHealth } from "./server-host";

// Privileged scheme must be registered before app ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

// App icon: used for the macOS Dock in dev (packaged builds bake the .icns
// into the bundle) and as the window icon on Windows/Linux.
const ICON_PATH = join(__dirname, "../resources/icon.png");

const MIME_BY_EXTENSION: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

const CONNECTING_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>Basin</title>
<style>
  body { margin:0; height:100vh; display:flex; flex-direction:column; gap:14px;
         align-items:center; justify-content:center; background:#09090b; color:#fafafa;
         font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }
  .ring { width:34px; height:34px; border-radius:50%; border:3px solid #27272a;
          border-top-color:#a1a1aa; animation:spin 0.9s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  p { margin:0; font-size:13px; color:#a1a1aa; }
  code { color:#d4d4d8; }
</style></head>
<body>
  <div class="ring"></div>
  <p>正在连接 Basin 本地服务…</p>
  <p>请确认已运行 <code>./start-basin.sh</code>（API：${config.apiUrl}）</p>
</body></html>`)}`;

let mainWindow: BrowserWindow | null = null;
let serverHost: ServerHost | null = null;
let apiHealthy = false;
let onConnectingPage = false;

// The Vite dev server is the live-editing surface (renderer HMR keeps
// working inside the Electron window). Packaged builds serve the static
// bundle through the basin:// protocol instead.
function useAppProtocol(): boolean {
  return app.isPackaged || config.forceAppProtocol;
}

function registerBasinProtocol(): void {
  protocol.handle(APP_PROTOCOL, (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }
    // Path traversal guard: only files inside webDist are served, with the
    // SPA entry as fallback (TanStack Router uses browser history).
    const resolved = join(config.webDist, pathname);
    const safePath = resolved.startsWith(config.webDist)
      ? resolved
      : join(config.webDist, "index.html");
    const finalPath = existsSync(safePath)
      ? safePath
      : join(config.webDist, "index.html");
    return new Response(new Uint8Array(readFileSync(finalPath)), {
      headers: {
        "Content-Type":
          MIME_BY_EXTENSION[extname(finalPath)] ?? "application/octet-stream",
      },
    });
  });
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "视图",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    icon: existsSync(ICON_PATH) ? ICON_PATH : undefined,
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Basin",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  // The renderer URL (Vite dev server) may not be listening yet at launch;
  // retry a bounded number of times instead of parking on the splash.
  let loadRetries = 0;
  mainWindow.webContents.on("did-finish-load", () => {
    loadRetries = 0;
    const url = mainWindow?.webContents.getURL() ?? "";
    if (!url.startsWith("data:")) {
      onConnectingPage = false;
    }
  });
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, code, description, url, isMainFrame) => {
      if (isMainFrame && mainWindow) {
        console.error(
          `[desktop] main frame failed to load (${code}): ${description} ${url}`,
        );
        if (loadRetries < 10) {
          loadRetries += 1;
          setTimeout(() => void navigateToApp(), 2000);
        } else {
          onConnectingPage = true;
          void mainWindow.loadURL(CONNECTING_PAGE).catch(() => {});
        }
      }
    },
  );
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void navigateToApp();
}

async function navigateToApp(): Promise<void> {
  if (!mainWindow) return;
  // Navigating while a navigation is in flight rejects; races here are
  // benign (the watchdog and retry timer can both fire).
  if (useAppProtocol()) {
    await mainWindow
      .loadURL(`${APP_PROTOCOL}://localhost/index.html`)
      .catch(() => {});
    return;
  }
  await mainWindow.loadURL(config.rendererUrl).catch(() => {});
}

function showConnecting(): void {
  onConnectingPage = true;
  if (mainWindow) {
    void mainWindow.loadURL(CONNECTING_PAGE).catch(() => {});
  }
}

app.setName("Basin");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    if (process.platform === "darwin" && existsSync(ICON_PATH)) {
      app.dock?.setIcon(ICON_PATH);
    }
    registerBasinProtocol();
    buildMenu();

    const host = startServerHost();
    serverHost = host;
    createWindow();
    // The watchdog owns every state transition and must be registered
    // unconditionally: if it only started after waitForHealthy succeeded,
    // a launch during an outage would never navigate (splash forever).
    // First successful probe navigates; dropouts splash; recoveries
    // re-navigate in case the renderer itself was the thing that was down.
    watchHealth(
      host.baseUrl,
      () => {
        apiHealthy = true;
        void navigateToApp();
      },
      () => {
        apiHealthy = false;
        showConnecting();
      },
    );

    // Self-heal: while parked on the connecting page with the API healthy
    // (e.g. the renderer server came up after the retry budget ran out),
    // keep trying to enter the app.
    setInterval(() => {
      if (apiHealthy && onConnectingPage) {
        void navigateToApp();
      }
    }, 4000);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    serverHost?.stop();
  });
}

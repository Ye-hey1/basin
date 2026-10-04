import { contextBridge } from "electron";

// Minimal bridge for now: lets the web app detect the desktop shell and read
// runtime versions. IPC surfaces (native notifications, file dialogs, tray
// actions) get added here as milestones land.
contextBridge.exposeInMainWorld("basinDesktop", {
  isDesktop: true,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});

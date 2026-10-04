const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  openVideoDialog: () => ipcRenderer.invoke("dialog:openVideo"),
  saveZipDialog: (defaultName) => ipcRenderer.invoke("dialog:saveZip", defaultName),
  readFileBuffer: (filePath) => ipcRenderer.invoke("fs:readFileBuffer", filePath),
  writeFileBuffer: (filePath, arrayBuffer) =>
    ipcRenderer.invoke("fs:writeFileBuffer", filePath, arrayBuffer),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onMaximizedChange: (callback) => {
    const handler = (_e, value) => callback(value);
    ipcRenderer.on("window:maximized", handler);
    return () => ipcRenderer.removeListener("window:maximized", handler);
  },
  onMenuOpenVideo: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("menu:open-video", handler);
    return () => ipcRenderer.removeListener("menu:open-video", handler);
  },
  onMenuExport: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("menu:export", handler);
    return () => ipcRenderer.removeListener("menu:export", handler);
  },
  removeBackground: (arrayBuffer, options) =>
    ipcRenderer.invoke("matting:removeBackground", arrayBuffer, options),
});

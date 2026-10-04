const { app, BrowserWindow, dialog, ipcMain, Menu, shell, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const { removeBackgroundFromBuffer } = require("./matting");

nativeTheme.themeSource = "dark";

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0c1014",
    title: "Godot Frame Animator",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximized", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximized", false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  // 无边框窗口仍保留加速键菜单（Alt 可呼出）
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "打开视频…",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow?.webContents.send("menu:open-video"),
        },
        {
          label: "导出 ZIP…",
          accelerator: "CmdOrCtrl+E",
          click: () => mainWindow?.webContents.send("menu:export"),
        },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "关于 Godot Frame Animator",
              message: "Godot Frame Animator",
              detail:
                `版本 ${app.getVersion()}\n\n` +
                "从视频抽帧、去水印、预览帧动画，并导出 Godot 4 SpriteFrames。\n" +
                "MIT License",
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("dialog:openVideo", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择视频",
    properties: ["openFile"],
    filters: [
      {
        name: "视频",
        extensions: ["mp4", "webm", "mov", "mkv", "avi", "m4v", "ogv"],
      },
      { name: "全部文件", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:saveZip", async (_event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "导出 Godot 资源 ZIP",
    defaultPath: defaultName || "animation_godot_frames.zip",
    filters: [{ name: "ZIP", extensions: ["zip"] }],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle("fs:readFileBuffer", async (_event, filePath) => {
  const data = await fs.promises.readFile(filePath);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
});

ipcMain.handle("fs:writeFileBuffer", async (_event, filePath, arrayBuffer) => {
  const buf = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(filePath, buf);
  return true;
});

ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});
ipcMain.handle("window:maximize", () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle("window:close", () => {
  mainWindow?.close();
});
ipcMain.handle("window:isMaximized", () => !!mainWindow?.isMaximized());

ipcMain.handle("matting:removeBackground", async (_event, arrayBuffer, options = {}) => {
  try {
    const out = await removeBackgroundFromBuffer(arrayBuffer, options);
    return { ok: true, buffer: out };
  } catch (err) {
    console.error("[matting]", err);
    return {
      ok: false,
      message: err && err.message ? err.message : String(err),
    };
  }
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

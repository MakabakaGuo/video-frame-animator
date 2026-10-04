# Godot Frame Animator

从视频抽帧、挑选帧序、去水印、预览帧动画，并导出 **Godot 4 SpriteFrames** 的跨平台桌面工具。

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/Electron-34-47848F)

## 功能

- 按目标 FPS / 帧间隔 / 时间间隔抽帧
- 帧网格挑选、拖拽排序
- 框选区域去水印（智能修补 / 模糊 / 边缘填充）
- 实时预览帧动画
- 导出独立 PNG 或精灵图集 + `.tres` / `.tscn`

## 截图

> 运行应用后自行截图替换到 `docs/screenshot.png`，并在此展示。

## 下载

前往 [Releases](../../releases) 下载对应平台安装包：

| 平台 | 产物 |
|------|------|
| Windows | 安装版 `.exe`（NSIS）或便携版 `portable.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

## 本地开发

### 环境要求

- Node.js 18+（推荐 20/22）
- npm 9+

### 安装与启动

```bash
git clone https://github.com/YOUR_USERNAME/godot-frame-animator.git
cd godot-frame-animator
npm install
npm start
```

### 打包

```bash
# 当前平台
npm run dist

# 指定平台
npm run dist:win
npm run dist:mac
npm run dist:linux
```

产物输出到 `release/` 目录。

## 使用说明

1. **文件 → 打开视频**（或 `Ctrl+O` / 拖拽）
2. 设置抽帧参数，点击 **开始抽帧**
3. 在帧列表中挑选、排序；需要时使用 **去水印**
4. **预览** 确认效果
5. **导出 ZIP**（`Ctrl+E`），解压到 Godot 项目根目录

默认资源路径前缀：`res://animations/frames/`

## 项目结构

```
godot-frame-animator/
├── electron/           # Electron 主进程
│   ├── main.js
│   └── preload.js
├── renderer/           # 界面与业务逻辑
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── watermark.js
│   └── lib/jszip.min.js
├── build/              # 打包资源（图标等）
├── .github/workflows/  # Release CI
└── package.json
```

## 发布到 GitHub

完整步骤见 [PUBLISH.md](PUBLISH.md)。简要流程：

1. 把 `package.json` 里的 `YOUR_USERNAME` 换成你的 GitHub 用户名  
2. 创建仓库并推送代码  
3. 打 tag 触发自动构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会构建多平台产物并上传到 Release。

本机 Windows 便携版也可直接：

```bash
npm run dist:win
```

产物在 `release/`（例如 `Godot Frame Animator-1.0.0-win-x64.exe`）。

## 技术说明

- 桌面壳：Electron
- 抽帧：Chromium 内置视频解码 + Canvas
- 去水印：本地像素算法，不上传网络
- 打包：electron-builder

## License

[MIT](LICENSE)

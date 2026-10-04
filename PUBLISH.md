# 发布到 GitHub 清单

把下面的 `YOUR_USERNAME` 全部换成你的 GitHub 用户名（仓库名默认 `godot-frame-animator`）。

## 1. 修改仓库地址

编辑 `package.json`：

- `homepage`
- `repository.url`
- `bugs.url`
- `build.publish[0].owner`

## 2. 初始化并推送

在项目根目录执行：

```bash
git init -b main
git add .
git commit -m "Initial release: Godot Frame Animator desktop app"
```

在 GitHub 新建空仓库 `godot-frame-animator`（不要勾选自动添加 README），然后：

```bash
git remote add origin https://github.com/YOUR_USERNAME/godot-frame-animator.git
git push -u origin main
```

或使用 GitHub CLI：

```bash
gh repo create godot-frame-animator --public --source=. --remote=origin --push
```

## 3. 发布安装包

### 方式 A：GitHub Actions（推荐）

```bash
git tag v1.0.0
git push origin v1.0.0
```

Actions 会构建 Windows / macOS / Linux 并上传到 Release。

### 方式 B：本机打包

```bash
npm run dist:win
```

产物在 `release/`，可手动上传到 GitHub Release。

> Windows 若出现 `Cannot create symbolic link`（winCodeSign），项目已设置 `signAndEditExecutable: false`。  
> 仍失败时可直接压缩 `release/win-unpacked/` 作为绿色版分发，或以管理员身份开启「开发人员模式」后再打包。

## 4. 仓库主页建议填写

- Description: `Desktop tool: extract video frames, remove watermarks, export Godot 4 SpriteFrames`
- Topics: `godot`, `electron`, `sprite-animation`, `gamedev`, `spriteframes`

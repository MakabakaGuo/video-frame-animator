# 贡献指南

感谢关注 Godot Frame Animator！

## 开发

```bash
npm install
npm start
```

若 Electron 下载失败（国内网络常见），项目已配置 `.npmrc` 镜像；也可手动设置：

```bash
# Windows PowerShell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install
```

## 提交建议

- 保持改动聚焦；UI 与导出格式变更请附简短说明
- Windows / macOS / Linux 若有条件请做冒烟测试（打开视频 → 抽帧 → 导出）

## 发布

维护者打 `v*` tag 后，GitHub Actions 会自动构建并上传 Release。

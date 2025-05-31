# LZ Music

基于 Bilibili API 的音乐播放器

## 功能特点

- 🎵 **音乐首页推荐** - 首页专注于音乐分区内容，提供优质音乐推荐
- 🔍 **智能搜索** - 支持音乐搜索和BV号直接播放
- 📱 **现代界面** - 简洁美观的用户界面
- 🎧 **播放控制** - 完整的音乐播放功能
- 📝 **播放历史** - 记录播放历史，便于重复收听
- 🔄 **多种播放模式** - 支持顺序播放、随机播放、单曲循环

## 音乐推荐算法

首页推荐优先显示音乐分区的内容，包括：
- 原创音乐、翻唱作品
- VOCALOID、演奏视频  
- 钢琴、吉他等乐器演奏
- 古风音乐、流行音乐
- 音乐MV、音乐合集

如果音乐分区内容获取失败，会降级到热门视频作为推荐。

## 安装和运行

### 开发环境
```bash
npm install
npm run dev-win  # Windows环境开发模式
```

### 生产构建
```bash
# 构建当前平台
npm run build

# 构建Windows版本
npm run build-win

# 构建Linux版本
npm run build-linux

# 构建macOS版本
npm run build-mac

# 构建所有平台
npm run build-all
```

## 发布流程

### 自动发布（推荐）

1. **创建版本标签**：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   推送标签后会自动触发GitHub Actions构建所有平台的安装包并创建发行版。

2. **手动触发构建**：
   - 在GitHub仓库的Actions页面
   - 选择"Build and Release"工作流
   - 点击"Run workflow"
   - 选择是否创建发行版
   - 输入版本标签（可选）

### 构建产物

工作流会自动构建以下平台的安装包：

**Windows:**
- 安装版: `LZ-Music-{version}-Setup.exe`
- 便携版: `LZ-Music-{version}-portable.exe`

**Linux:**
- AppImage: `LZ-Music-{version}.AppImage`
- Debian包: `LZ-Music-{version}.deb`
- RPM包: `LZ-Music-{version}.rpm`

**macOS:**
- DMG安装包: `LZ-Music-{version}.dmg`

### 发布控制

- **自动发布**: 推送以`v`开头的标签时自动创建发行版
- **手动发布**: 在GitHub Actions中手动触发，可选择是否创建发行版
- **仅构建**: 普通提交只会构建但不发布，构建产物保留30天

## 技术栈

- Electron
- Vanilla JavaScript
- Bilibili API
- HTML5 Audio
- SQLite3 (数据存储)

## 项目结构

```
lzmusic/
├── src/
│   ├── js/
│   │   ├── app.js          # 主应用逻辑
│   │   ├── api/            # API相关
│   │   ├── components/     # UI组件
│   │   └── utils/          # 工具函数
│   └── css/               # 样式文件
├── main.js                # Electron主进程
└── package.json
```

## 许可证

GPL 3.0
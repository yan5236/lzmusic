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
npm run build
```

## 技术栈

- Electron
- Vanilla JavaScript
- Bilibili API
- HTML5 Audio

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

MIT License 
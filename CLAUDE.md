# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Electron + React + TypeScript + Vite 的桌面应用程序项目。

- **UI 框架**: React 19 + TypeScript
- **桌面框架**: Electron
- **构建工具**: Vite (React UI) + TypeScript Compiler (Electron 主进程)
- **样式**: Tailwind CSS + Material-UI (@mui/material) + Emotion
- **代码规范**: ESLint

## 项目架构

### 目录结构
```
src/
  ├── ui/              # React UI 代码
  │   ├── App.tsx      # 主应用组件
  │   ├── main.tsx     # React 入口
  │   └── assets/      # UI 资源文件
  └── electron/        # Electron 主进程代码
      └── main.ts      # Electron 主入口
```

### 构建产物分离
- React UI 构建到 `dist-react/` 目录
- Electron 主进程构建到 `dist-electron/` 目录
- Electron 通过 `dist-react/index.html` 加载 React 应用

## 常用命令

### 开发
```bash
npm run dev
```
构建 React UI + Electron 主进程，然后启动 Electron 应用

### 构建
```bash
npm run build              # 构建所有内容
npm run build:react        # 仅构建 React UI
npm run build:electron     # 仅构建 Electron 主进程
```

### 打包应用
```bash
npm run pack              # 构建并打包到目录（不生成安装包）
npm run dist              # 构建并生成安装包（当前平台）
npm run dist:win          # 构建 Windows 安装包
npm run dist:mac          # 构建 macOS 安装包
npm run dist:linux        # 构建 Linux 安装包
```

### 代码质量
```bash
npm run lint              # 运行 ESLint 检查
```

## 配置文件说明

- `vite.config.ts`: Vite 配置，设置了 React 和 Tailwind CSS 插件，输出目录为 `dist-react`
- `tsconfig.electron.json`: Electron 主进程的 TypeScript 配置，输出到 `dist-electron`
- `tsconfig.app.json`: React UI 的 TypeScript 配置
- `electron-builder.json`: Electron 应用打包配置
  - Windows: portable + msi 安装包
  - macOS: dmg 安装包
  - Linux: AppImage

## 开发注意事项

1. **分离的构建流程**: React UI 和 Electron 主进程是分别构建的，修改 Electron 代码需要重新编译主进程
2. **路径配置**: Vite 使用 `base: './'` 确保资源路径相对化，适配 Electron 文件加载
3. **TypeScript 严格模式**: 项目启用了 TypeScript 严格模式和多项代码质量检查
4. **模块化原则**: 需要保持代码模块化以便于维护
5. **注释规范**: 除非不太必要的文件，否则应该添加适当的注释

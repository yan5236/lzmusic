/**
 * 本地音乐 IPC 处理器
 * 提供本地歌曲管理、元数据提取、文件选择等功能
 */

import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as mm from 'music-metadata';
import { appDatabase } from '../database/appDatabase.js';

// 支持的音频格式
const SUPPORTED_AUDIO_FORMATS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac'];

/**
 * 递归扫描目录下的所有音频文件
 */
async function scanAudioFiles(dirPath: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        const subFiles = await scanAudioFiles(fullPath);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_AUDIO_FORMATS.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败 [${dirPath}]:`, error);
  }

  return results;
}

/**
 * 提取音频文件的元数据
 */
async function extractMetadata(filePath: string): Promise<{
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverPath?: string;
}> {
  try {
    const metadata = await mm.parseFile(filePath);

    // 提取封面图片
    let coverPath: string | undefined;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const coverDir = path.join(app.getPath('userData'), 'covers');

      // 确保封面目录存在
      if (!fs.existsSync(coverDir)) {
        await fs.promises.mkdir(coverDir, { recursive: true });
      }

      // 生成唯一的文件名
      const ext = picture.format.split('/')[1] || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      coverPath = path.join(coverDir, fileName);

      // 保存封面图片
      await fs.promises.writeFile(coverPath, picture.data);
    }

    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || '未知艺术家',
      album: metadata.common.album,
      duration: metadata.format.duration || 0,
      coverPath,
    };
  } catch (error) {
    console.error(`提取元数据失败 [${filePath}]:`, error);
    // 返回基本信息
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: '未知艺术家',
      duration: 0,
    };
  }
}

/**
 * 注册本地音乐相关的 IPC 处理器
 */
export function registerLocalMusicHandlers(): void {
  // ========== 文件选择 ==========

  // 打开文件选择对话框（选择音频文件）
  ipcMain.handle('local-music-select-files', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择音频文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '音频文件', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      return { success: true, filePaths: result.filePaths, canceled: result.canceled };
    } catch (error) {
      console.error('打开文件选择对话框失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 打开文件夹选择对话框
  ipcMain.handle('local-music-select-folder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择音乐文件夹',
        properties: ['openDirectory'],
      });

      return { success: true, folderPath: result.filePaths[0], canceled: result.canceled };
    } catch (error) {
      console.error('打开文件夹选择对话框失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // ========== 文件夹扫描与导入 ==========

  // 扫描文件夹并创建虚拟文件夹导入歌曲
  ipcMain.handle('local-music-scan-folder', async (_event, folderPath: string) => {
    try {
      // 使用文件夹名称作为虚拟文件夹名称
      const folderName = path.basename(folderPath);
      const folderId = appDatabase.createLocalFolder(folderName);

      // 扫描文件夹中的音频文件
      const audioFiles = await scanAudioFiles(folderPath);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // 逐个提取元数据并导入
      for (const filePath of audioFiles) {
        try {
          const metadata = await extractMetadata(filePath);
          appDatabase.addLocalTrack(folderId, {
            file_path: filePath,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            cover_path: metadata.coverPath,
          });
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`${path.basename(filePath)}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return {
        success: true,
        folderId,
        folderName,
        totalFiles: audioFiles.length,
        successCount,
        failedCount,
        errors,
      };
    } catch (error) {
      console.error('扫描文件夹失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 添加文件到已存在的虚拟文件夹
  ipcMain.handle('local-music-add-files', async (_event, folderId: string, filePaths: string[]) => {
    try {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const filePath of filePaths) {
        try {
          const metadata = await extractMetadata(filePath);
          appDatabase.addLocalTrack(folderId, {
            file_path: filePath,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            cover_path: metadata.coverPath,
          });
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`${path.basename(filePath)}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return {
        success: true,
        successCount,
        failedCount,
        errors,
      };
    } catch (error) {
      console.error('添加文件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // ========== 虚拟文件夹操作 ==========

  // 创建空虚拟文件夹
  ipcMain.handle('local-music-create-folder', async (_event, name: string) => {
    try {
      const id = appDatabase.createLocalFolder(name);
      return { success: true, id };
    } catch (error) {
      console.error('创建虚拟文件夹失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 获取所有虚拟文件夹
  ipcMain.handle('local-music-get-folders', async () => {
    try {
      const folders = appDatabase.getAllLocalFolders();
      return { success: true, data: folders };
    } catch (error) {
      console.error('获取虚拟文件夹列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 重命名虚拟文件夹
  ipcMain.handle('local-music-rename-folder', async (_event, folderId: string, newName: string) => {
    try {
      appDatabase.renameLocalFolder(folderId, newName);
      return { success: true };
    } catch (error) {
      console.error('重命名虚拟文件夹失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 删除虚拟文件夹
  ipcMain.handle('local-music-delete-folder', async (_event, folderId: string) => {
    try {
      appDatabase.deleteLocalFolder(folderId);
      return { success: true };
    } catch (error) {
      console.error('删除虚拟文件夹失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // ========== 本地歌曲操作 ==========

  // 获取指定文件夹的歌曲列表
  ipcMain.handle('local-music-get-tracks', async (_event, folderId: string) => {
    try {
      const tracks = appDatabase.getLocalTracks(folderId);
      return { success: true, data: tracks };
    } catch (error) {
      console.error('获取本地歌曲列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 删除本地歌曲
  ipcMain.handle('local-music-delete-track', async (_event, trackId: string) => {
    try {
      appDatabase.deleteLocalTrack(trackId);
      return { success: true };
    } catch (error) {
      console.error('删除本地歌曲失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  // 根据ID获取本地歌曲详情
  ipcMain.handle('local-music-get-track-by-id', async (_event, trackId: string) => {
    try {
      const track = appDatabase.getLocalTrackById(trackId);
      return { success: true, data: track };
    } catch (error) {
      console.error('获取本地歌曲详情失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  });

  console.log('本地音乐 IPC 处理器已注册');
}

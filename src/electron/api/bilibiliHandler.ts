/**
 * Bilibili API 处理器 - 在 Electron 主进程中调用
 * 避免浏览器跨域限制,更容易设置 Cookie 和 Headers
 */

import { ipcMain } from 'electron';
import type {
  BilibiliVideo,
  SearchResult,
  BilibiliResponse,
  SearchResponseData,
  VideoInfoResponseData,
  AudioUrlResponse,
  AudioUrlCacheItem,
} from '../../shared/types.js';

class BilibiliAPI {
  private baseURL = 'https://api.bilibili.com';
  private buvid3: string;
  private audioUrlCache: Map<string, AudioUrlCacheItem> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.buvid3 = this.generateBuvid3();
  }

  /**
   * 生成 buvid3 Cookie 值
   * 格式: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXinfoc
   */
  private generateBuvid3(): string {
    const generateSegment = (length: number): string => {
      const chars = '0123456789ABCDEF';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    };

    const timestamp = Date.now().toString(16).toUpperCase();
    const parts = [
      generateSegment(8),
      generateSegment(4),
      generateSegment(4),
      generateSegment(4),
      timestamp.padStart(12, '0'),
    ];

    return parts.join('-') + 'infoc';
  }

  /**
   * 生成请求所需的 UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 获取请求 Headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Origin': 'https://www.bilibili.com',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Cookie': `buvid3=${this.buvid3}; _uuid=${this.generateUUID()}`,
    };
  }

  /**
   * 清理视频标题中的 HTML 标签和转义字符
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/<[^>]*>/g, '') // 移除 HTML 标签
      .replace(/&quot;/g, '"') // 替换引号
      .replace(/&amp;/g, '&')  // 替换 &
      .replace(/&lt;/g, '<')   // 替换 <
      .replace(/&gt;/g, '>')   // 替换 >
      .trim();
  }

  /**
   * 检查是否为 BV 号
   */
  public isBVID(input: string): boolean {
    return /^BV[A-Za-z0-9]{10}$/.test(input.trim());
  }

  /**
   * 获取搜索建议关键词
   * @param term 输入的搜索内容
   * @returns 搜索建议列表
   */
  public async getSearchSuggestions(term: string): Promise<string[]> {
    if (!term.trim()) {
      return [];
    }

    const url = 'https://s.search.bilibili.com/main/suggest';
    const params = new URLSearchParams({
      term: term.trim(),
      main_ver: 'v1',
      highlight: '',
      func: 'suggest',
      suggest_type: 'accurate',
      sub_type: 'tag',
      tag_num: '10',
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        code: number;
        result?: {
          tag?: Array<{
            value: string;
            name: string;
          }>;
        };
      };

      if (data.code !== 0) {
        throw new Error('获取搜索建议失败');
      }

      // 提取建议关键词的 value 字段
      const suggestions = data.result?.tag?.map(item => item.value) || [];
      return suggestions;
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      // 失败时返回空数组,不影响搜索功能
      return [];
    }
  }

  /**
   * 搜索视频
   * @param keyword 搜索关键词
   * @param page 页码(从1开始)
   * @returns 搜索结果
   */
  public async searchVideos(keyword: string, page: number = 1): Promise<SearchResult> {
    const url = `${this.baseURL}/x/web-interface/search/type`;
    const params = new URLSearchParams({
      search_type: 'video',
      keyword: keyword.trim(),
      page: page.toString(),
      order: '', // 综合排序
      duration: '', // 全部时长
      highlight: '1', // 启用高亮
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      // 处理 412 错误(请求被拦截)
      if (response.status === 412) {
        // 延迟后重试一次
        await new Promise((resolve) => setTimeout(resolve, 1000));
        throw new Error('请求被服务器限制,请稍后重试');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as BilibiliResponse<SearchResponseData>;

      if (data.code !== 0) {
        throw new Error(data.message || '搜索失败');
      }

      // 处理搜索结果
      const videos: BilibiliVideo[] = (data.data.result || []).map((video) => ({
        bvid: video.bvid,
        title: this.cleanTitle(video.title),
        author: video.author,
        cover: video.pic.startsWith('//') ? 'https:' + video.pic : video.pic,
        duration: video.duration,
        play: video.play,
        pubdate: video.pubdate,
      }));

      return {
        videos,
        total: data.data.numResults || 0,
        page: data.data.page || page,
        pageSize: data.data.pagesize || 20,
      };
    } catch (error) {
      console.error('搜索视频失败:', error);
      throw error;
    }
  }

  /**
   * 获取音频流URL
   * @param bvid Bilibili 视频 ID
   * @param cid 分P的 CID
   * @returns 音频流URL信息(包含主URL和备用URLs)
   */
  public async getAudioUrl(bvid: string, cid: number): Promise<AudioUrlResponse> {
    try {
      // 验证参数
      if (!bvid || !cid) {
        throw new Error('缺少必要参数: bvid或cid为空');
      }

      // 确保CID是有效的数字
      const numericCid = Number(cid);
      if (isNaN(numericCid) || numericCid <= 0) {
        throw new Error(`无效的CID: ${cid}`);
      }

      // 生成缓存键
      const cacheKey = `${bvid}_${numericCid}`;

      // 检查缓存
      const cached = this.audioUrlCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`使用缓存的音频流URL: ${cacheKey}`);
        return cached.data;
      }

      // 调用Bilibili API获取音频流
      const url = `${this.baseURL}/x/player/playurl`;
      const params = new URLSearchParams({
        bvid: bvid.toString(),
        cid: Math.floor(numericCid).toString(),
        qn: '0',      // 清晰度: 0=自动
        fnval: '16',  // 流格式: 16=DASH格式(包含音频流)
        fourk: '1',   // 4K支持
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      // 处理 412 错误(请求被限制)
      if (response.status === 412) {
        throw new Error('请求被服务器限制，请稍后重试');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as BilibiliResponse<{
        dash: {
          audio: Array<{
            base_url: string;
            backup_url?: string[];
          }>;
        };
      }>;

      if (data.code !== 0) {
        throw new Error(data.message || '获取音频流失败');
      }

      // 提取音频流URL
      const audioData = data.data.dash.audio[0];
      if (!audioData) {
        throw new Error('未找到音频流数据');
      }

      const result: AudioUrlResponse = {
        url: audioData.base_url,
        backup_urls: audioData.backup_url || [],
        all_urls: [audioData.base_url, ...(audioData.backup_url || [])],
      };

      // 缓存结果
      this.audioUrlCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      console.log(`成功获取音频流URL: ${cacheKey}`);
      return result;
    } catch (error) {
      console.error('获取音频流失败:', error);
      throw error;
    }
  }

  /**
   * 获取视频详细信息(包含 cid 和分P信息)
   * @param bvid Bilibili 视频 ID
   * @returns 视频详细信息
   */
  public async getVideoInfo(bvid: string): Promise<BilibiliVideo> {
    const url = `${this.baseURL}/x/web-interface/view`;
    const params = new URLSearchParams({ bvid });

    // 定义重试逻辑
    const fetchWithRetry = async (retries: number = 2): Promise<Response> => {
      try {
        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        // 处理 412 错误(请求被限制)，延迟后重试
        if (response.status === 412 && retries > 0) {
          console.log(`视频 ${bvid} 请求被限制，${retries} 次重试剩余...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchWithRetry(retries - 1);
        }

        return response;
      } catch (error) {
        // 网络错误时重试
        if (retries > 0) {
          console.log(`视频 ${bvid} 网络错误，${retries} 次重试剩余...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
          return fetchWithRetry(retries - 1);
        }
        throw error;
      }
    };

    try {
      const response = await fetchWithRetry();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as BilibiliResponse<VideoInfoResponseData>;

      if (data.code !== 0) {
        throw new Error(data.message || '获取视频信息失败');
      }

      const videoData = data.data;

      return {
        bvid: videoData.bvid,
        title: this.cleanTitle(videoData.title),
        author: '', // 视频详情 API 返回的作者信息在其他字段,这里简化处理
        cover: videoData.pic.startsWith('//') ? 'https:' + videoData.pic : videoData.pic,
        duration: videoData.pages[0]?.duration || 0,
        play: 0,
        pubdate: 0,
        cid: videoData.cid,
        pages: videoData.pages.map((page) => ({
          cid: page.cid,
          page: page.page,
          part: page.part,
          duration: page.duration,
        })),
      };
    } catch (error) {
      console.error(`获取视频 ${bvid} 信息失败:`, error);
      throw new Error(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 创建单例
const bilibiliAPI = new BilibiliAPI();

/**
 * 注册 IPC 处理器
 */
export function registerBilibiliHandlers(): void {
  // 搜索视频
  ipcMain.handle('search-videos', async (_event, keyword: string, page: number) => {
    try {
      return await bilibiliAPI.searchVideos(keyword, page);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  });

  // 获取视频详情
  ipcMain.handle('get-video-info', async (_event, bvid: string) => {
    try {
      return await bilibiliAPI.getVideoInfo(bvid);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  });

  // 检查是否为 BV 号
  ipcMain.handle('is-bvid', (_event, input: string) => {
    return bilibiliAPI.isBVID(input);
  });

  // 获取音频流URL
  ipcMain.handle('get-audio-url', async (_event, bvid: string, cid: number) => {
    try {
      return await bilibiliAPI.getAudioUrl(bvid, cid);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  });

  // 获取搜索建议
  ipcMain.handle('get-search-suggestions', async (_event, term: string) => {
    try {
      return await bilibiliAPI.getSearchSuggestions(term);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  });
}

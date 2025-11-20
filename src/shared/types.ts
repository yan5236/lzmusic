/**
 * Bilibili API 相关类型定义
 * 此文件在 Electron 主进程和 React UI 之间共享
 */

// Bilibili 视频分P信息
export interface BilibiliPage {
  cid: number;      // 分P的 CID
  page: number;     // 分P序号(从1开始)
  part: string;     // 分P标题
  duration: number; // 分P时长(秒)
}

// Bilibili 视频信息
export interface BilibiliVideo {
  bvid: string;           // Bilibili 视频 ID
  title: string;          // 视频标题
  author: string;         // UP主名称
  cover: string;          // 封面图片 URL
  duration: string | number; // 视频时长(字符串格式"4:18"或秒数)
  play: number;           // 播放量
  pubdate: number;        // 发布时间戳
  cid?: number;           // 视频的 CID(获取详情后才有)
  pages?: BilibiliPage[]; // 分P信息列表(获取详情后才有)
}

// 搜索结果
export interface SearchResult {
  videos: BilibiliVideo[]; // 视频列表
  total: number;           // 总结果数(最大1000)
  page: number;            // 当前页码
  pageSize: number;        // 每页数量(固定20)
}

// Bilibili API 响应格式
export interface BilibiliResponse<T = unknown> {
  code: number;    // 0=成功, -400=请求错误, -412=请求被拦截
  message: string; // 错误信息
  data: T;         // 响应数据
}

// 搜索 API 响应数据
export interface SearchResponseData {
  page: number;
  pagesize: number;
  numResults: number;
  numPages: number;
  result: Array<{
    type: string;
    bvid: string;
    title: string;
    author: string;
    pic: string;
    duration: string;
    play: number;
    pubdate: number;
  }>;
}

// 视频详情 API 响应数据
export interface VideoInfoResponseData {
  bvid: string;
  title: string;
  pic: string;
  cid: number;
  pages: Array<{
    cid: number;
    page: number;
    part: string;
    duration: number;
  }>;
}

// 音频流URL响应
export interface AudioUrlResponse {
  /** 主音频流URL */
  url: string;
  /** 备用音频流URL列表 */
  backup_urls: string[];
  /** 所有可用的音频流URL (主URL + 备用URLs) */
  all_urls: string[];
}

// 音频流缓存项
export interface AudioUrlCacheItem {
  /** 音频流数据 */
  data: AudioUrlResponse;
  /** 缓存时间戳 (毫秒) */
  timestamp: number;
}

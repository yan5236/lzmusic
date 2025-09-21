class BilibiliAPI {
  constructor() {
    this.baseURL = 'https://api.bilibili.com';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    };
    // 生成基本的buvid3以避免412错误
    this.buvid3 = this.generateBuvid3();
  }

  // 生成buvid3
  generateBuvid3() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += Date.now().toString(36).slice(-8) + 'infoc';
    return result;
  }

  // 获取完整的headers，包括cookie
  getHeaders() {
    return {
      ...this.headers,
      'Cookie': `buvid3=${this.buvid3}; _uuid=${Date.now()}${Math.random().toString(36).slice(2)}`
    };
  }

  // 搜索视频
  async searchVideos(keyword, page = 1) {
    try {
      const url = `${this.baseURL}/x/web-interface/search/type`;
      const params = new URLSearchParams({
        context: '',
        search_type: 'video',
        page: page.toString(),
        order: '',
        keyword,
        duration: '',
        tids_1: '',
        tids_2: '',
        __refresh__: 'true',
        _extra: '',
        highlight: '1',
        single_column: '0'
      });

      console.log('搜索请求URL:', `${url}?${params}`);

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      console.log('响应状态:', response.status);
      console.log('响应Headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 412) {
        console.warn('遇到412错误，可能是请求频率过高，稍后重试');
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('请求被服务器限制，请稍后重试');
      }

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('非JSON响应:', responseText.substring(0, 500));
        throw new Error('API返回了非JSON响应，可能是网络限制或验证码');
      }

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON解析失败:', text.substring(0, 500));
        throw new Error('API响应解析失败，可能需要人机验证');
      }

      if (data.code !== 0) {
        console.error('API错误:', data);
        throw new Error(data.message || '搜索失败');
      }

      if (!data.data || !data.data.result) {
        throw new Error('搜索结果为空');
      }

      return {
        videos: data.data.result.map(video => ({
          bvid: video.bvid,
          title: this.cleanTitle(video.title),
          author: video.author,
          cover: video.pic.startsWith('//') ? 'https:' + video.pic : video.pic,
          duration: video.duration,
          play: video.play,
          pubdate: video.pubdate
        })),
        total: data.data.numResults || 0
      };
    } catch (error) {
      console.error('搜索视频失败:', error);
      throw error;
    }
  }

  // 获取视频信息
  async getVideoInfo(bvid) {
    try {
      const url = `${this.baseURL}/x/web-interface/view`;
      const params = new URLSearchParams({ bvid });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.status === 412) {
        throw new Error('请求被服务器限制，请稍后重试');
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.message || '获取视频信息失败');
      }

      const videoInfo = data.data;
      return {
        bvid: videoInfo.bvid,
        title: videoInfo.title,
        author: videoInfo.owner.name,
        cover: videoInfo.pic,
        duration: videoInfo.duration,
        cid: videoInfo.pages[0].cid,
        pages: videoInfo.pages || [],
        desc: videoInfo.desc
      };
    } catch (error) {
      console.error('获取视频信息失败:', error);
      throw error;
    }
  }

  // 获取音频流 URL
  async getAudioUrl(bvid, cid) {
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

      const url = `${this.baseURL}/x/player/playurl`;
      const params = new URLSearchParams({
        bvid: bvid.toString(),
        cid: Math.floor(numericCid).toString(),
        qn: '0',
        fnval: '16',
        fourk: '1'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.status === 412) {
        throw new Error('请求被服务器限制，请稍后重试');
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.message || '获取音频流失败');
      }

      const audioData = data.data.dash.audio[0];
      const urls = [audioData.base_url, ...(audioData.backup_url || [])];
      
      return {
        url: audioData.base_url,
        backup_urls: audioData.backup_url || [],
        all_urls: urls
      };
    } catch (error) {
      console.error('获取音频流失败:', error);
      throw error;
    }
  }

  // 数组随机排序工具方法
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // 获取音乐分区推荐视频（修改策略）
  async getMusicRecommendations() {
    try {
      const recommendations = [];
      
      // 优先使用音乐相关关键词搜索，而不是空关键词按分区筛选
      const musicSearchTerms = [
        { keyword: '音乐', tids: [3, 28, 29] },
        { keyword: '翻唱', tids: [31] },
        { keyword: '原创音乐', tids: [28] },
        { keyword: 'VOCALOID', tids: [30] },
        { keyword: '演奏', tids: [59] },
        { keyword: '钢琴', tids: [59] },
        { keyword: '吉他', tids: [59] },
        { keyword: '古风音乐', tids: [3, 28] }
      ];
      
      // 随机选择几个搜索词
      const selectedTerms = this.shuffleArray(musicSearchTerms).slice(0, 3);
      
      for (const term of selectedTerms) {
        try {
          const searchResult = await this.searchVideos(term.keyword, 1);
          if (searchResult && searchResult.videos && searchResult.videos.length > 0) {
            // 取前4个结果
            const videos = searchResult.videos.slice(0, 4);
            recommendations.push(...videos);
          }
        } catch (error) {
          console.warn(`搜索音乐关键词 "${term.keyword}" 失败:`, error);
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // 如果推荐数量不够，再尝试一些流行的音乐关键词
      if (recommendations.length < 8) {
        try {
          const fallbackKeywords = ['音乐合集', '歌曲', 'MV', '纯音乐', '流行音乐'];
          const randomKeyword = fallbackKeywords[Math.floor(Math.random() * fallbackKeywords.length)];
          const searchResult = await this.searchVideos(randomKeyword, 1);
          
          if (searchResult && searchResult.videos) {
            const filteredVideos = searchResult.videos.filter(video => 
              !recommendations.some(rec => rec.bvid === video.bvid)
            );
            recommendations.push(...filteredVideos.slice(0, 8 - recommendations.length));
          }
        } catch (error) {
          console.warn('获取补充音乐搜索结果失败:', error);
        }
      }
      
      // 去重并随机排序
      const uniqueRecommendations = recommendations.filter((video, index, arr) => 
        arr.findIndex(v => v.bvid === video.bvid) === index
      );
      
      return this.shuffleArray(uniqueRecommendations).slice(0, 12);
    } catch (error) {
      console.error('获取音乐推荐失败:', error);
      return [];
    }
  }

  // 获取推荐视频（修改为优先音乐内容）
  async getRecommendedVideos() {
    try {
      // 优先尝试获取音乐分区推荐
      const musicRecommendations = await this.getMusicRecommendations();
      if (musicRecommendations && musicRecommendations.length > 0) {
        console.log('成功获取音乐分区推荐:', musicRecommendations.length, '个视频');
        return musicRecommendations;
      }
      
      // 如果音乐推荐失败，降级到原有的热门视频接口
      console.warn('音乐推荐获取失败，降级到热门视频');
      return await this.getPopularVideos();
    } catch (error) {
      console.error('获取推荐视频失败:', error);
      return [];
    }
  }

  // 获取热门视频（原逻辑保留作为降级方案）
  async getPopularVideos() {
    try {
      // 使用热门视频接口作为推荐
      const url = `${this.baseURL}/x/web-interface/popular`;
      const params = new URLSearchParams({
        ps: '20',
        pn: '1'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.status === 412) {
        console.warn('推荐视频请求被限制，使用默认列表');
        return [];
      }

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API返回了非JSON响应，可能是网络限制');
      }

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('推荐视频JSON解析失败:', text.substring(0, 500));
        throw new Error('推荐API响应解析失败');
      }

      if (data.code !== 0) {
        throw new Error(data.message || '获取推荐失败');
      }

      if (!data.data || !data.data.list) {
        throw new Error('推荐数据为空');
      }

      return data.data.list.map(video => ({
        bvid: video.bvid,
        title: video.title,
        author: video.owner.name,
        cover: video.pic,
        duration: video.duration,
        play: video.stat.view,
        pubdate: video.pubdate
      }));
    } catch (error) {
      console.error('获取热门视频失败:', error);
      return [];
    }
  }

  // 检测是否为 BV 号
  isBVID(input) {
    return /^BV[A-Za-z0-9]{10}$/.test(input.trim());
  }

  // 清理标题中的 HTML 标签
  cleanTitle(title) {
    return title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }

  // 格式化时长
  formatDuration(duration) {
    if (typeof duration === 'string') {
      return duration;
    }
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 格式化播放量
  formatPlayCount(play) {
    if (play >= 10000) {
      return (play / 10000).toFixed(1) + '万';
    }
    return play.toString();
  }

  // 获取搜索建议
  async getSearchSuggestions(keyword) {
    try {
      if (!keyword || keyword.trim().length < 2) {
        return [];
      }

      const cleanKeyword = keyword.trim();
      
      // 使用官方B站搜索建议API
      const url = 'https://s.search.bilibili.com/main/suggest';
      const params = new URLSearchParams({
        term: cleanKeyword,
        main_ver: 'v1',
        highlight: '',
        func: 'suggest',
        suggest_type: 'accurate',
        sub_type: 'tag',
        tag_num: '10',
        special_num: '10',
        bangumi_num: '10',
        upuser_num: '3',
        rnd: Math.random().toString()
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com/',
          'Origin': 'https://www.bilibili.com'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '获取搜索建议失败');
      }

      if (!data.result || !data.result.tag) {
        return [];
      }

      // 解析真实的搜索建议数据
      return data.result.tag.map(item => ({
        keyword: item.value || item.term,
        highlight: item.name || item.value || item.term
      }));

    } catch (error) {
      console.error('获取搜索建议失败:', error);
      // 失败时返回空数组，不提供虚假数据
      return [];
    }
  }

  // 获取热门搜索词
  async getHotSearches() {
    try {
      // 使用手机端热搜API，不需要Wbi签名
      const url = 'https://app.bilibili.com/x/v2/search/trending/ranking';
      const params = new URLSearchParams({
        limit: '10' // 热搜数量，范围[1, 100]
      });
      
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com/',
          'Origin': 'https://www.bilibili.com'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '获取热门搜索失败');
      }

      if (!data.data || !data.data.list) {
        return [];
      }

      return data.data.list.map(item => ({
        keyword: item.keyword,
        show_name: item.show_name || item.keyword
      })).slice(0, 10);

    } catch (error) {
      console.error('获取热门搜索失败:', error);
      // 失败时返回空数组，不提供虚假数据
      return [];
    }
  }
}

// 创建全局实例
window.BilibiliAPI = BilibiliAPI; 
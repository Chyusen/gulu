/**
 * 咕噜 Gulu — 三大板块前端服务
 * 对应 tech-plan-2026
 * 1. AI 生成形象
 * 2. 高德地图
 * 3. 小红书推荐
 */

import { apiClient } from './api';

// ========== 类型定义 ==========

export interface ImageGenerateRequest {
  user_id: string;
  type: 'pet_avatar' | 'pet_evolution' | 'user_avatar' | 'scene_illustration';
  style: '3d_cartoon' | '2d_anime' | 'pixel_art' | 'cyberpunk';
  custom_prompt?: string;
  user_description?: string;
}

export interface ImageTask {
  id: string;
  user_id?: string;
  type?: string;
  style?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  image_url?: string;
  error_msg?: string;
  created_at?: string;
  completed_at?: string;
}

export interface ImageQuota {
  user_id: string;
  used_count: number;
  max_count: number;
  reset_date: string;
}

export interface PoiItem {
  id?: string;
  name: string;
  typecode?: string;
  address?: string;
  location: string;
  distance?: string;
}

export interface NearbyPoiResult {
  pois: PoiItem[];
  count: string;
  _mock?: boolean;
}

export interface DirectionResult {
  route: any;
  mode: string;
  _mock?: boolean;
}

export interface RegaoResult {
  formatted_address: string;
  addressComponent: any;
  _mock?: boolean;
}

export interface NearbyUser {
  user_id: string;
  lng: number;
  lat: number;
  distance?: number;
}

export interface ContentItem {
  id?: string;
  platform: string;
  external_id: string;
  title: string;
  summary: string;
  tags: string[];
  likes: number;
  location?: string;
  cover_url?: string;
}

export interface Recommendation {
  content: ContentItem;
  score: number;
  reason: string;
}

export interface RecommendResult {
  recommendations: Recommendation[];
  profile: {
    mbti?: string;
    zodiac?: string;
    description?: string;
  };
}

// ========== AI 生成形象服务 ==========

export const imageService = {
  /** 提交生成请求 */
  async generate(data: ImageGenerateRequest): Promise<{ task_id: string; status: string }> {
    return apiClient.post('/images/generate', data);
  },

  /** 查询任务状态 */
  async getTask(taskId: string): Promise<ImageTask> {
    return apiClient.get(`/images/tasks/${taskId}`);
  },

  /** 查询用户历史任务 */
  async listTasks(userId: string, limit = 20): Promise<{ tasks: ImageTask[]; total: number }> {
    return apiClient.get('/images/tasks', { params: { user_id: userId, limit } });
  },

  /** 查询配额 */
  async getQuota(userId: string): Promise<ImageQuota> {
    return apiClient.get('/images/quota', { params: { user_id: userId } });
  },

  /** 获取支持的风格 */
  async getStyles(): Promise<{ styles: string[]; types: string[] }> {
    return apiClient.get('/images/styles');
  },

  /** 轮询任务直到完成 */
  async pollTask(taskId: string, intervalMs = 2000, maxAttempts = 30): Promise<ImageTask> {
    for (let i = 0; i < maxAttempts; i++) {
      const task = await this.getTask(taskId);
      if (task.status === 'completed' || task.status === 'failed') {
        return task;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error('任务超时');
  },
};

// ========== 高德地图服务 ==========

export const mapService = {
  /** 周边 POI 搜索 */
  async searchNearby(location: string, keywords = '', radius = 1000): Promise<NearbyPoiResult> {
    return apiClient.get('/map/nearby', { params: { location, keywords, radius } });
  },

  /** 路线规划 */
  async getDirection(origin: string, destination: string, mode: 'driving' | 'walking' | 'transit' = 'walking'): Promise<DirectionResult> {
    return apiClient.get('/map/direction', { params: { origin, destination, mode } });
  },

  /** 逆地理编码 */
  async regeo(location: string): Promise<RegaoResult> {
    return apiClient.get('/map/regeo', { params: { location } });
  },

  /** 地理编码 */
  async geocode(address: string): Promise<{ geocodes: any[] }> {
    return apiClient.get('/map/geocode', { params: { address } });
  },

  /** 更新用户位置 */
  async updateLocation(userId: string, lng: number, lat: number): Promise<void> {
    await apiClient.post('/map/location', null, { params: { user_id: userId, lng, lat } });
  },

  /** 查询附近用户 */
  async getNearbyUsers(location: string, radius = 1000, excludeUserId?: string): Promise<{ users: NearbyUser[]; total: number }> {
    return apiClient.get('/map/nearby-users', {
      params: { location, radius, exclude_user_id: excludeUserId },
    });
  },

  /** 获取用户位置 */
  async getUserLocation(userId: string): Promise<{ user_id: string; lng: number; lat: number }> {
    return apiClient.get(`/map/location/${userId}`);
  },
};

// ========== 小红书推荐服务 ==========

export const recommendationService = {
  /** 获取推荐内容 */
  async recommend(userId: string, topK = 5, mbti?: string, zodiac?: string): Promise<RecommendResult> {
    return apiClient.post('/recommendations/contents', {
      user_id: userId,
      top_k: topK,
      mbti,
      zodiac,
    });
  },

  /** 基于位置的实时 AI 推荐 */
  async recommendByLocation(
    userId: string,
    location: string,
    mbti?: string,
    zodiac?: string,
    topK = 5,
  ): Promise<RecommendResult & { location?: string; source?: string }> {
    return apiClient.post('/recommendations/location', {
      user_id: userId,
      location,
      mbti,
      zodiac,
      top_k: topK,
    });
  },

  /** 获取内容列表 */
  async listContents(page = 1, limit = 20, platform?: string): Promise<{ contents: ContentItem[]; page: number }> {
    return apiClient.get('/recommendations/contents/list', {
      params: { page, limit, platform },
    });
  },
};

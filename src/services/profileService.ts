/**
 * 咕噜 Gulu — 用户画像服务
 * 对接后端 /api/v1/profile 接口
 */

import { apiClient } from './api';
import type { User, MBTIType, ZodiacType } from '../types';

interface ProfileResponse {
  user_id: string;
  personality_analysis: string;
  recommended_pet_traits: {
    personality_type: string;
    description: string;
    match_score: number;
  };
  recommended_styles: string[];
}

export const profileService = {
  /** 创建/更新用户画像 */
  async createProfile(data: {
    mbti: MBTIType;
    zodiac: ZodiacType;
    birth_date?: string;
    nickname?: string;
  }): Promise<ProfileResponse> {
    return apiClient.post('/profile', data);
  },

  /** 获取用户画像 */
  async getProfile(userId: string): Promise<User> {
    return apiClient.get(`/profile/${userId}`);
  },

  /** 更新用户信息 */
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    return apiClient.patch(`/profile/${userId}`, data);
  },
};

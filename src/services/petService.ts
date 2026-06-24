/**
 * 咕噜 Gulu — 宠物服务
 * 对接后端 /api/v1/pets 接口
 */

import { apiClient } from './api';
import type { Pet, StyleType, FeedType, HealAction, InteractionType } from '../types';

interface GeneratePetRequest {
  user_id: string;
  style: StyleType;
  custom_description?: string;
  name?: string;
}

interface FeedResponse {
  energy_level: number;
  message: string;
  pet_response: string;
}

interface HealResponse {
  graying_severity: number;
  is_healed: boolean;
  pet_response: string;
}

interface InteractResponse {
  pet_emotion: string;
  animation_trigger: string;
  sound_url?: string;
}

export const petService = {
  /** 生成宠物（AI 形象） */
  async generatePet(data: GeneratePetRequest): Promise<Pet> {
    return apiClient.post('/pets/generate', data);
  },

  /** 获取宠物信息 */
  async getPet(petId: string): Promise<Pet> {
    return apiClient.get(`/pets/${petId}`);
  },

  /** 喂食 */
  async feed(petId: string, feedType: FeedType): Promise<FeedResponse> {
    return apiClient.post(`/pets/${petId}/feed`, { feed_type: feedType });
  },

  /** 治疗 */
  async heal(petId: string, action: HealAction): Promise<HealResponse> {
    return apiClient.post(`/pets/${petId}/heal`, { heal_action: action });
  },

  /** 互动 */
  async interact(petId: string, type: InteractionType): Promise<InteractResponse> {
    return apiClient.post(`/pets/${petId}/interact`, { interaction_type: type });
  },

  /** 切换风格 */
  async updateStyle(petId: string, style: StyleType): Promise<Pet> {
    return apiClient.patch(`/pets/${petId}/style`, { style });
  },
};

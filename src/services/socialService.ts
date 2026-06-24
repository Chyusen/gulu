/**
 * 咕噜 Gulu — 宠物社交服务
 * 对接后端 /api/v1/social 接口
 * 对应需求文档 七、宠物社交系统
 */

import { apiClient } from './api';
import type { NearbyPet } from '../types';

interface DiscoverNearbyResponse {
  nearby_pets: NearbyPet[];
  radius: number;
}

interface InteractResponse {
  interaction_id: string;
  message: string;
  pet_response: string;
}

export const socialService = {
  /** 发现附近宠物 */
  async discoverNearby(
    lat: number,
    lng: number,
    radius: number = 500
  ): Promise<DiscoverNearbyResponse> {
    return apiClient.post('/social/nearby', { lat, lng, radius });
  },

  /** 发起互动 */
  async initiateInteraction(
    petId: string,
    targetPetId: string,
    interactionType: string,
    giftId?: string
  ): Promise<InteractResponse> {
    return apiClient.post('/social/interact', {
      pet_id: petId,
      target_pet_id: targetPetId,
      interaction_type: interactionType,
      gift_id: giftId,
    });
  },
};

/**
 * 咕噜 Gulu — 探索页服务（demo 阶段返回 mock 数据）
 * 对应需求文档 5.2 / 5.3
 */

import { mockNearbyPets, type MockNearbyPet } from '../mocks/nearbyPets';
import { getCitywalkGuides, type CitywalkGuide } from '../mocks/citywalkGuides';
import type { MBTIType, ZodiacType, POI } from '../types';

export interface NearbyPetsResponse {
  pets: MockNearbyPet[];
}

export interface CitywalkResponse {
  guides: CitywalkGuide[];
}

export interface NearbyPOIResponse {
  pois: POI[];
}

const MOCK_POIS: POI[] = [
  { id: 'poi-1', name: '星光公园', type: '公园', lat: 31.232, lng: 121.471, distance: 120, address: '距离你 120m' },
  { id: 'poi-2', name: '治愈咖啡馆', type: '餐饮', lat: 31.228, lng: 121.468, distance: 350, address: '距离你 350m' },
  { id: 'poi-3', name: '旧书店', type: '书店', lat: 31.235, lng: 121.475, distance: 520, address: '距离你 520m' },
];

export const exploreService = {
  async getNearbyPets(_lat: number, _lng: number): Promise<NearbyPetsResponse> {
    // demo 阶段忽略真实坐标，返回 mock 数据
    return { pets: mockNearbyPets };
  },

  async getCitywalkGuides(
    mbti: MBTIType | null,
    zodiac: ZodiacType | null,
    _lat: number,
    _lng: number,
  ): Promise<CitywalkResponse> {
    return { guides: getCitywalkGuides(mbti, zodiac) };
  },

  async getNearbyPOI(_lat: number, _lng: number): Promise<NearbyPOIResponse> {
    return { pois: MOCK_POIS };
  },
};

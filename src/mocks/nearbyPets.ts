/**
 * 咕噜 Gulu — 附近宠物/用户 mock 数据
 * 对应需求文档 5.2 地图标记
 */

import type { StyleType, PetStage } from '../types';

export interface MockNearbyPet {
  id: string;
  name: string;
  style: StyleType;
  stage: PetStage;
  distance: number;
  ownerNickname: string;
  intro: string;
  lat: number;
  lng: number;
}

// Demo 阶段只保留 4 种风格
const STYLES: StyleType[] = ['anime', 'realistic', 'pixel', 'scifi'];
const STAGES: PetStage[] = ['baby', 'adult', 'divine'];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDistance(): number {
  return Math.floor(Math.random() * 800) + 50;
}

const OWNER_NAMES = ['小星', '阿夜', '梦旅人', '云游者', '风铃', '流光', '星河', '月影'];
const INTROS = [
  '喜欢在黄昏时散步，收集落叶。',
  '刚刚完成一次城市探险，能量满满。',
  '正在寻找一起 Citywalk 的伙伴。',
  '性格温和，喜欢安静的角落。',
  '对世界充满好奇，随时准备出发。',
];

export const mockNearbyPets: MockNearbyPet[] = Array.from({ length: 8 }, (_, i) => ({
  id: `nearby-pet-${i}`,
  name: `咕噜小伙伴 ${i + 1}`,
  style: randomPick(STYLES),
  stage: randomPick(STAGES),
  distance: randomDistance(),
  ownerNickname: randomPick(OWNER_NAMES),
  intro: randomPick(INTROS),
  lat: 31.23 + (Math.random() - 0.5) * 0.02,
  lng: 121.47 + (Math.random() - 0.5) * 0.02,
}));

export function findNearbyPetById(id: string): MockNearbyPet | undefined {
  return mockNearbyPets.find((p) => p.id === id);
}

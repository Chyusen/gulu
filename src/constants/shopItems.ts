/**
 * 咕噜 Gulu — 商店物品数据
 * 对应需求文档 十、商业化系统
 */

import type { ShopItem } from '../types';
import { FOODS } from './foods';

/** 商店物品列表（模拟数据） */
export const SHOP_ITEMS: ShopItem[] = [
  // 喂食物品
  { id: 'item_sunlight', name: '日光瓶', type: 'food', price: 10, currency: 'gulu_coin', description: '补充 20 点能量', isLimited: false },
  { id: 'item_moonlight', name: '月光瓶', type: 'food', price: 10, currency: 'gulu_coin', description: '补充 20 点能量', isLimited: false },
  { id: 'item_forget_grass', name: '忘忧草', type: 'food', price: 30, currency: 'gulu_coin', description: '补充 30 点能量', isLimited: false },
  { id: 'item_soul_feast', name: '灵魂盛宴', type: 'food', price: 50, currency: 'star_dust', description: '补充 50 点能量', isLimited: false },

  // 配饰（含环境氛围类）
  { id: 'item_sakura', name: '樱花发饰', type: 'accessory', price: 100, currency: 'star_dust', description: '春日限定配饰', isLimited: true, imageUrl: 'icon_accessory_sakura' },
  { id: 'item_umbrella', name: '小伞', type: 'accessory', price: 80, currency: 'star_dust', description: '雨天好伙伴', isLimited: false, imageUrl: 'icon_accessory_umbrella' },
  { id: 'item_music_note', name: '音符徽章', type: 'accessory', price: 120, currency: 'star_dust', description: '音乐爱好者', isLimited: false, imageUrl: 'icon_accessory_music_note' },
  { id: 'skin_aurora', name: '极光氛围', type: 'accessory', price: 200, currency: 'star_dust', description: '梦幻极光效果', isLimited: false, imageUrl: 'icon_accessory_aurora' },
  { id: 'skin_nebula', name: '星云氛围', type: 'accessory', price: 200, currency: 'star_dust', description: '神秘星云效果', isLimited: false, imageUrl: 'icon_accessory_nebula' },

  // 背景（场景）
  { id: 'scene_sakura', name: '樱花庭院', type: 'scene', price: 150, currency: 'star_dust', description: '浪漫樱花场景', isLimited: false },
  { id: 'scene_forest', name: '魔法森林', type: 'scene', price: 150, currency: 'star_dust', description: '神秘森林场景', isLimited: false },
  { id: 'scene_sea', name: '深海龙宫', type: 'scene', price: 180, currency: 'star_dust', description: '海底世界场景', isLimited: false },
  { id: 'scene_cloud', name: '云端星巢', type: 'scene', price: 180, currency: 'star_dust', description: '云端之上的星之巢穴', isLimited: false },
];

/** 物品 id → 物品信息映射 */
export const ITEM_MAP: Record<string, ShopItem> = SHOP_ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, ShopItem>
);

/** 根据 itemId 获取物品信息（同时查找 SHOP_ITEMS 和 FOODS） */
export function getItemById(itemId: string): ShopItem | undefined {
  // 先查找商店物品
  const shopItem = ITEM_MAP[itemId];
  if (shopItem) return shopItem;

  // 再查找食物，将 Food 转换为 ShopItem 格式
  const food = FOODS.find((f) => f.id === itemId);
  if (food) {
    return {
      id: food.id,
      name: food.name,
      type: 'food',
      price: food.price,
      currency: 'gulu_coin',
      description: food.description ?? `体力 +${food.staminaRestore} · 亲密 +${food.intimacyBase}`,
      isLimited: false,
    };
  }

  return undefined;
}

/** 物品类型 → emoji */
export const ITEM_TYPE_EMOJI: Record<string, string> = {
  food: '🍬',
  accessory: '🎀',
  skin: '🎨',
  scene: '🏞️',
  gift: '🎁',
  effect: '✨',
};

/** 物品类型 → 中文标签 */
export const ITEM_TYPE_LABEL: Record<string, string> = {
  food: '食物',
  accessory: '配饰',
  skin: '皮肤',
  scene: '场景',
  gift: '礼物',
  effect: '特效',
};

/** 场景物品 ID → 场景资源键（用于 Background 组件切换背景） */
export const SCENE_ITEM_TO_KEY: Record<string, string> = {
  scene_sakura: 'sakura_courtyard',
  scene_forest: 'magic_forest',
  scene_sea: 'deep_sea_palace',
  scene_cloud: 'cloud_nest',
};

/** 饰品物品 ID → 饰品资源键（用于在宠物身上显示饰品） */
export const ACCESSORY_ITEM_TO_KEY: Record<string, string> = {
  item_sakura: 'sakura',
  item_umbrella: 'umbrella',
  item_music_note: 'music_note',
  skin_aurora: 'aurora',
  skin_nebula: 'nebula',
};

/** 饰品佩戴位置配置（相对于 200px 宠物尺寸的偏移与缩放） */
export interface AccessoryPosition {
  /** 水平偏移：0 为居中，负左正右 */
  x: number;
  /** 垂直偏移：0 为居中，负上正下 */
  y: number;
  /** 尺寸缩放 */
  scale: number;
}

export const ACCESSORY_POSITIONS: Record<string, AccessoryPosition> = {
  sakura: { x: 0, y: -82, scale: 0.55 },
  umbrella: { x: 55, y: 15, scale: 0.7 },
  music_note: { x: 0, y: 25, scale: 0.45 },
  aurora: { x: 0, y: 0, scale: 1.1 },
  nebula: { x: 0, y: 0, scale: 1.1 },
};
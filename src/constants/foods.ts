/**
 * 咕噜 Gulu — 食物数据
 */

import type { Food } from '../types';

export const FOODS: Food[] = [
  // 每日基础食物（无限库存）
  {
    id: 'basic_biscuit',
    name: '咕噜小饼干',
    emoji: '🍪',
    quality: 'normal',
    staminaRestore: 15,
    intimacyBase: 5,
    price: 0,
    isBasic: true,
    description: '每天限量三份的暖心小饼干～',
    stock: -1,
    imageUrl: 'food_basic_biscuit',
  },

  // 普通品质
  {
    id: 'star_fruit',
    name: '星星果',
    emoji: '🍎',
    quality: 'normal',
    staminaRestore: 10,
    intimacyBase: 5,
    price: 10,
    isBasic: false,
    description: '甜甜的星星果，咕噜也喜欢～',
    stock: 99,
    imageUrl: 'food_star_fruit',
  },
  {
    id: 'moon_tea',
    name: '月光茶',
    emoji: '🍵',
    quality: 'normal',
    staminaRestore: 12,
    intimacyBase: 6,
    price: 15,
    isBasic: false,
    description: '淡淡的月光味道，让人安心。',
    stock: 99,
    imageUrl: 'food_moon_tea',
  },
  {
    id: 'cloud_bread',
    name: '云朵面包',
    emoji: '🍞',
    quality: 'normal',
    staminaRestore: 15,
    intimacyBase: 7,
    price: 20,
    isBasic: false,
    description: '像云朵一样柔软的面包。',
    stock: 99,
    imageUrl: 'food_cloud_bread',
  },

  // 优良品质
  {
    id: 'dream_cake',
    name: '梦境蛋糕',
    emoji: '🍰',
    quality: 'good',
    staminaRestore: 18,
    intimacyBase: 8,
    price: 30,
    isBasic: false,
    description: '吃了会梦到美好事物的蛋糕。',
    stock: 50,
    imageUrl: 'food_dream_cake',
  },
  {
    id: 'sun_soup',
    name: '暖阳汤',
    emoji: '🥣',
    quality: 'good',
    staminaRestore: 20,
    intimacyBase: 9,
    price: 35,
    isBasic: false,
    description: '暖暖的，像被阳光拥抱。',
    stock: 50,
    imageUrl: 'food_sun_soup',
  },
  {
    id: 'rainbow_jelly',
    name: '彩虹果冻',
    emoji: '🍮',
    quality: 'good',
    staminaRestore: 22,
    intimacyBase: 10,
    price: 40,
    isBasic: false,
    description: '七种颜色，七种好心情。',
    stock: 50,
    imageUrl: 'food_rainbow_jelly',
  },

  // 稀有品质
  {
    id: 'star_soup',
    name: '星河羹',
    emoji: '🥄',
    quality: 'rare',
    staminaRestore: 25,
    intimacyBase: 10,
    price: 80,
    isBasic: false,
    description: '用星星熬成的羹，珍贵又美味。',
    stock: 20,
    imageUrl: 'food_star_soup',
  },
  {
    id: 'aurora_candy',
    name: '极光糖',
    emoji: '🍬',
    quality: 'rare',
    staminaRestore: 28,
    intimacyBase: 12,
    price: 90,
    isBasic: false,
    description: '在嘴里绽放的极光。',
    stock: 20,
    imageUrl: 'food_aurora_candy',
  },
  {
    id: 'soul_pudding',
    name: '灵魂布丁',
    emoji: '🍨',
    quality: 'rare',
    staminaRestore: 30,
    intimacyBase: 15,
    price: 100,
    isBasic: false,
    description: '只有最亲密的伙伴才配享用。',
    stock: 20,
    imageUrl: 'food_soul_pudding',
  },
];

/** 根据 ID 查找食物 */
export function getFoodById(id: string): Food | undefined {
  return FOODS.find((food) => food.id === id);
}

/** 基础食物 */
export const BASIC_FOOD = FOODS.find((food) => food.isBasic)!;

/** 每种性格关键词对应的偏好食物 ID 列表（3 种） */
export const PERSONALITY_FOOD_PREFERENCES: Record<string, string[]> = {
  '温柔-梦幻-细腻': ['dream_cake', 'moon_tea', 'star_soup'],
  '温柔-共情-理想主义': ['dream_cake', 'cloud_bread', 'soul_pudding'],
  '内向-安静-思考': ['moon_tea', 'cloud_bread', 'aurora_candy'],
  '理性-独立-好奇': ['star_fruit', 'rainbow_jelly', 'star_soup'],
  '外向-活泼-热情': ['star_fruit', 'rainbow_jelly', 'soul_pudding'],
  '开朗-社交-乐观': ['cloud_bread', 'rainbow_jelly', 'soul_pudding'],
  '务实-可靠-责任': ['sun_soup', 'cloud_bread', 'star_soup'],
  '自由-冒险-创造': ['star_fruit', 'rainbow_jelly', 'aurora_candy'],
};

/** 根据性格关键词生成偏好食物列表，找不到时返回默认列表 */
export function getPreferredFoodsByPersonality(personalityKeywords: string[]): string[] {
  for (const [key, foods] of Object.entries(PERSONALITY_FOOD_PREFERENCES)) {
    if (personalityKeywords.some((k) => key.includes(k))) {
      return foods;
    }
  }
  return ['star_fruit', 'dream_cake', 'star_soup'];
}

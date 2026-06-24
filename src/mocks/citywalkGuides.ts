/**
 * 咕噜 Gulu — Citywalk 攻略 mock 数据
 * 对应需求文档 5.3 Citywalk 攻略
 */

import type { MBTIType, ZodiacType } from '../types';

export interface CitywalkGuide {
  id: string;
  title: string;
  tags: string[];
  intro: string;
  distance: string;
  duration: string;
}

const DEFAULT_GUIDES: CitywalkGuide[] = [
  {
    id: 'default-1',
    title: '星光下的梧桐道',
    tags: ['漫步', '夜景'],
    intro: '沿着老城区的梧桐树慢慢走，路灯把影子拉得很长，适合放空。',
    distance: '2.3km',
    duration: '约 40 分钟',
  },
  {
    id: 'default-2',
    title: '河滨微风线',
    tags: ['水边', '放松'],
    intro: '滨江步道开阔，晚风带着水汽，是整理思绪的好地方。',
    distance: '3.1km',
    duration: '约 55 分钟',
  },
  {
    id: 'default-3',
    title: '巷弄咖啡漫游',
    tags: ['咖啡', '探索'],
    intro: '钻进几条安静的小巷，随机挑一家咖啡馆坐下，观察路人。',
    distance: '1.8km',
    duration: '约 60 分钟',
  },
];

const MBTI_GUIDES: Partial<Record<MBTIType, CitywalkGuide[]>> = {
  INFJ: [
    {
      id: 'infj-1',
      title: 'INFJ 的深夜书店线',
      tags: ['阅读', '安静'],
      intro: '从独立书店到24小时自习室，在文字与灯光里找回自己。',
      distance: '2.0km',
      duration: '约 90 分钟',
    },
    {
      id: 'infj-2',
      title: 'INFJ 的护城河倒影',
      tags: ['水边', '沉思'],
      intro: '沿着河岸慢行，看城市灯火倒映在水面，像一幅流动的画。',
      distance: '3.5km',
      duration: '约 70 分钟',
    },
    {
      id: 'infj-3',
      title: 'INFJ 的老树巷',
      tags: ['自然', '独处'],
      intro: '树荫覆盖的石板路，偶尔有猫窜过，适合带一本小书。',
      distance: '1.5km',
      duration: '约 35 分钟',
    },
  ],
  ENFP: [
    {
      id: 'enfp-1',
      title: 'ENFP 的彩色市集',
      tags: ['热闹', '美食'],
      intro: '从街头小吃到文创摊位，一路吃吃喝喝，认识陌生人。',
      distance: '1.6km',
      duration: '约 120 分钟',
    },
    {
      id: 'enfp-2',
      title: 'ENFP 的即兴涂鸦墙',
      tags: ['艺术', '拍照'],
      intro: '转角遇到涂鸦墙，停下来拍几张，顺便和路人交换笑容。',
      distance: '2.2km',
      duration: '约 50 分钟',
    },
    {
      id: 'enfp-3',
      title: 'ENFP 的夜市探险',
      tags: ['夜市', '玩乐'],
      intro: '霓虹灯、棉花糖、套圈游戏，把夜晚当成游乐场。',
      distance: '2.8km',
      duration: '约 100 分钟',
    },
  ],
  ISTJ: [
    {
      id: 'istj-1',
      title: 'ISTJ 的博物馆环线',
      tags: ['文化', '秩序'],
      intro: '按导览图依次参观，每件展品都有编号和故事。',
      distance: '2.4km',
      duration: '约 150 分钟',
    },
    {
      id: 'istj-2',
      title: 'ISTJ 的林荫大道',
      tags: ['规划', '步行'],
      intro: '笔直宽阔的步道，红绿灯清晰，节奏稳定可控。',
      distance: '3.0km',
      duration: '约 45 分钟',
    },
    {
      id: 'istj-3',
      title: 'ISTJ 的古建筑巡礼',
      tags: ['历史', '建筑'],
      intro: '老建筑的门牌和雕花都有讲究，值得逐一看过。',
      distance: '2.1km',
      duration: '约 80 分钟',
    },
  ],
};

const ZODIAC_PREFIXES: Partial<Record<ZodiacType, string>> = {
  摩羯座: '踏实的',
  水瓶座: '新奇的',
  双鱼座: '梦幻的',
  白羊座: '活力的',
  金牛座: '享受的',
  双子座: '变化的',
  巨蟹座: '温馨的',
  狮子座: '璀璨的',
  处女座: '精致的',
  天秤座: '优雅的',
  天蝎座: '神秘的',
  射手座: '自由的',
};

export function getCitywalkGuides(
  mbti?: MBTIType | null,
  zodiac?: ZodiacType | null,
): CitywalkGuide[] {
  const base = (mbti && MBTI_GUIDES[mbti]) || DEFAULT_GUIDES;
  const prefix = zodiac ? ZODIAC_PREFIXES[zodiac] ?? '奇妙的' : '奇妙的';
  return base.map((guide, index) => ({
    ...guide,
    id: `${mbti ?? 'default'}-${zodiac ?? 'default'}-${index}`,
    title: `${prefix}${guide.title}`,
  }));
}

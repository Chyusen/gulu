/**
 * 咕噜 Gulu — 互动配置数据
 * 对应需求文档 5.1~5.5 宠物互动系统
 */

import type { InteractionAnimation } from '../hooks/usePetAnimation';
import type { PetEmotion } from '../types';

export interface InteractionConfig {
  type: InteractionAnimation;
  label: string;
  icon: string;
  duration: number;
  energyGain: number;
  /** 互动气泡文案池 */
  bubbles: string[];
  /** 音效名 */
  sfx: string;
}

/** 长按菜单 4 项 */
export const INTERACTION_MENU_ITEMS: InteractionConfig[] = [
  {
    type: 'pet',
    label: '抚摸',
    icon: '✋',
    duration: 1500,
    energyGain: 2,
    bubbles: ['好舒服~', '你的手好温暖', '再摸一下嘛~'],
    sfx: 'pet',
  },
  {
    type: 'poke',
    label: '戳一戳',
    icon: '👆',
    duration: 1000,
    energyGain: 0,
    bubbles: ['哎呀！', '戳我干嘛呀？', '调皮~'],
    sfx: 'click',
  },
  {
    type: 'hug',
    label: '拥抱',
    icon: '🤗',
    duration: 2000,
    energyGain: 5,
    bubbles: ['抱抱！', '我好喜欢你~', '这样好安心'],
    sfx: 'heal',
  },
  {
    type: 'feed',
    label: '喂食',
    icon: '🍪',
    duration: 2500,
    energyGain: 20,
    bubbles: ['好吃！', '谢谢你！', '这是我最喜欢的！'],
    sfx: 'feed',
  },
];

/** 短按即时反馈池 */
export interface TapFeedback {
  animation: InteractionAnimation;
  bubble: string;
  sfx: string;
}

/** 根据情绪获取短按反馈 */
export function getTapFeedback(emotion: PetEmotion): TapFeedback {
  const happyPool: TapFeedback[] = [
    { animation: 'pet', bubble: '好舒服~', sfx: 'pet' },
    { animation: 'pet', bubble: '你的手指好温暖', sfx: 'pet' },
    { animation: 'double_tap', bubble: '见到你好开心！', sfx: 'feed' },
    { animation: 'pet', bubble: '再摸一下嘛~', sfx: 'pet' },
  ];

  const grayingPool: TapFeedback[] = [
    { animation: 'pet', bubble: '你来了...', sfx: 'pet' },
    { animation: 'pet', bubble: '我感觉好多了...', sfx: 'heal' },
    { animation: 'pet', bubble: '谢谢你没走...', sfx: 'pet' },
  ];

  const dormantPool: TapFeedback[] = [
    { animation: 'pet', bubble: '嗯...你来了...', sfx: 'pet' },
    { animation: 'pet', bubble: '让我再睡一会儿...', sfx: 'pet' },
  ];

  const normalPool: TapFeedback[] = [
    { animation: 'pet', bubble: '嗯？我在听呢', sfx: 'click' },
    { animation: 'pet', bubble: '你找我呀？', sfx: 'click' },
    { animation: 'pet', bubble: '好舒服~', sfx: 'pet' },
    { animation: 'pet', bubble: '再摸一下嘛~', sfx: 'pet' },
  ];

  let pool: TapFeedback[];
  switch (emotion) {
    case 'happy':
    case 'excited':
      pool = happyPool;
      break;
    case 'graying':
      pool = grayingPool;
      break;
    case 'dormant':
      pool = dormantPool;
      break;
    default:
      pool = normalPool;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/** 双击惊喜文案池 */
export const DOUBLE_TAP_SURPRISES: string[] = [
  '哇！吓我一跳~',
  '你找到我的开关了吗？',
  '嘿嘿，被我发现了~',
  '今天运气真好！',
  '这是专属我们的暗号吗？',
];

/** 冷却文案 */
export const COOLDOWN_BUBBLE = '让我歇一下嘛~';

/** 互动冷却时间（毫秒） */
export const INTERACTION_COOLDOWN = 3000;
/** 连续短按上限 */
export const MAX_CONSECUTIVE_TAPS = 3;
/** 疲惫冷却时间（毫秒） */
export const FATIGUE_COOLDOWN = 5000;

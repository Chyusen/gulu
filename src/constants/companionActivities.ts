/**
 * 咕噜 Gulu — 室内陪伴活动配置
 */

import type { CompanionActivityType } from '../types';

export interface CompanionActivityConfig {
  type: CompanionActivityType;
  name: string;
  emoji: string;
  minDuration: number;       // 最短时长（分钟）
  maxDuration: number;       // 最长时长（分钟）
  defaultDuration: number;   // 默认时长（分钟）
  energyPerMinute: number;   // 每分钟能量
  intimacyBase: number;      // 基础亲密度
  description: string;
  color: string;
}

export const COMPANION_ACTIVITIES: CompanionActivityConfig[] = [
  {
    type: 'meditation',
    name: '冥想呼吸',
    emoji: '🧘',
    minDuration: 3,
    maxDuration: 10,
    defaultDuration: 5,
    energyPerMinute: 1.5,
    intimacyBase: 5,
    description: '和咕噜一起深呼吸，慢慢静下来～',
    color: '#A78BFA',
  },
  {
    type: 'pomodoro',
    name: '番茄学习',
    emoji: '🍅',
    minDuration: 25,
    maxDuration: 25,
    defaultDuration: 25,
    energyPerMinute: 0.4,
    intimacyBase: 15,
    description: '咕噜陪你专注 25 分钟，然后一起休息一下～',
    color: '#F87171',
  },
  {
    type: 'journal',
    name: '写日记',
    emoji: '📔',
    minDuration: 5,
    maxDuration: 15,
    defaultDuration: 10,
    energyPerMinute: 0.6,
    intimacyBase: 10,
    description: '把心情写下来，咕噜会认真倾听～',
    color: '#FBBF24',
  },
  {
    type: 'music',
    name: '听音乐',
    emoji: '🎵',
    minDuration: 10,
    maxDuration: 30,
    defaultDuration: 15,
    energyPerMinute: 0.55,
    intimacyBase: 5,
    description: '选一首喜欢的歌，和咕噜一起轻轻摇摆～',
    color: '#34D399',
  },
];

/** 根据类型查找活动配置 */
export function getCompanionActivity(type: CompanionActivityType): CompanionActivityConfig {
  return COMPANION_ACTIVITIES.find((a) => a.type === type)!;
}

/** 计算陪伴活动奖励 */
export function calculateCompanionRewards(
  type: CompanionActivityType,
  durationMinutes: number
): { energy: number; intimacy: number } {
  const config = getCompanionActivity(type);
  const energy = Math.floor(config.energyPerMinute * durationMinutes);
  return {
    energy,
    intimacy: config.intimacyBase,
  };
}

/**
 * 咕噜 Gulu — 任务系统常量
 */

import type { DailyTask, WeeklyTask } from '../types';

export interface DailyTaskTemplate {
  type: DailyTask['type'];
  getDescription: (stageNumber: 1 | 2 | 3) => string;
  target: { 1: number; 2: number; 3: number };
  baseReward: number;
}

export interface WeeklyTaskTemplate {
  type: WeeklyTask['type'];
  description: string;
  target: number;
  baseReward: number;
}

/** 每日任务模板 */
export const DAILY_TASK_TEMPLATES: DailyTaskTemplate[] = [
  {
    type: 'chat',
    getDescription: (stageNumber) => `与咕噜对话 ${[0, 1, 3, 5][stageNumber]} 次`,
    target: { 1: 1, 2: 3, 3: 5 },
    baseReward: 20,
  },
  {
    type: 'feed',
    getDescription: (stageNumber) => `喂食咕噜 ${[0, 1, 2, 3][stageNumber]} 次`,
    target: { 1: 1, 2: 2, 3: 3 },
    baseReward: 15,
  },
  {
    type: 'explore',
    getDescription: (stageNumber) => `外出探索 ${[0, 1, 2, 3][stageNumber]} 次`,
    target: { 1: 1, 2: 2, 3: 3 },
    baseReward: 30,
  },
  {
    type: 'companion',
    getDescription: (stageNumber) => `完成陪伴活动 ${[0, 1, 2, 3][stageNumber]} 次`,
    target: { 1: 1, 2: 2, 3: 3 },
    baseReward: 25,
  },
  {
    type: 'social',
    getDescription: (stageNumber) => `社交互动 ${[0, 1, 2, 3][stageNumber]} 次`,
    target: { 1: 1, 2: 2, 3: 3 },
    baseReward: 20,
  },
];

/** 每周任务模板 */
export const WEEKLY_TASK_TEMPLATES: WeeklyTaskTemplate[] = [
  {
    type: 'explore',
    description: '累计探索 5 次',
    target: 5,
    baseReward: 10,
  },
  {
    type: 'chat',
    description: '累计与咕噜对话 15 次',
    target: 15,
    baseReward: 8,
  },
  {
    type: 'companion',
    description: '完成 3 次陪伴活动',
    target: 3,
    baseReward: 12,
  },
];

/** 每日任务完成 5/5 时的额外奖励 */
export const DAILY_ALL_COMPLETE_BONUS = 50;

/** 连击加成触发天数（连续 3 天全完成） */
export const STREAK_BONUS_DAYS = 3;

/** 连击加成倍率 */
export const STREAK_MULTIPLIER = 1.5;

/** 每周任务星尘系数 */
export const WEEKLY_MULTIPLIERS = [
  { threshold: 1.0, multiplier: 2.0 },
  { threshold: 0.8, multiplier: 1.5 },
  { threshold: 0.5, multiplier: 1.0 },
  { threshold: 0.0, multiplier: 0.5 },
];

/** 任务重置时间（凌晨 4 点） */
export const TASK_RESET_HOUR = 4;

/**
 * 咕噜 Gulu — 进化系统常量
 */

import type { PetStage } from '../types';

/** 进化阈值 */
export const EVOLUTION_THRESHOLDS = {
  1: { intimacy: 200, energy: 500, staminaPercent: 0.5 },   // 萌芽体 → 成长体
  2: { intimacy: 500, energy: 1500, staminaPercent: 0.5 },  // 成长体 → 灵魂体
} as const;

/** 各阶段数值上限 */
export const STAGE_LIMITS = {
  1: { stamina: 100, intimacy: 300, energy: 500 },
  2: { stamina: 150, intimacy: 500, energy: 1500 },
  3: { stamina: 200, intimacy: 800, energy: 3000 },
} as const;

/** 阶段编号 → 阶段名称映射 */
export const STAGE_NUMBER_MAP: Record<number, PetStage> = {
  1: 'baby',
  2: 'adult',
  3: 'divine',
};

/** 阶段中文名称 */
export const STAGE_NAMES: Record<number, string> = {
  1: '萌芽体',
  2: '成长体',
  3: '灵魂体',
};

/** 亲密度衰减规则 */
export const INTIMACY_DECAY = {
  graceHours: 24,        // 宽容期（小时）
  mildHours: 72,         // 温和衰减截止（小时）
  mildRate: 0.02,        // 24~72h 每天衰减 2%
  acceleratedRate: 0.05, // 72h 后每天衰减 5%
} as const;

/** 自主探索体力消耗（每小时） */
export const AUTO_EXPLORE_STAMINA_PER_HOUR = {
  1: 5,
  2: 8,
  3: 12,
} as const;

/** 自主探索最大时长（小时） */
export const AUTO_EXPLORE_MAX_HOURS = {
  1: 4,
  2: 4,
  3: 8,
} as const;

/** 体力阈值 */
export const STAMINA_THRESHOLD = {
  exploreMinPercent: 0.2,   // 低于 20% 无法探索
  tiredPercent: 0.1,        // 低于 10% 疲惫状态
} as const;

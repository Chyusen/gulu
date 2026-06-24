/**
 * 咕噜 Gulu — 养成引擎
 * 对应需求文档 四、灵魂镜像养成系统
 * - 能量自然衰减（每日 -10）
 * - 灰化症触发（连续3天情绪负面）
 * - 三段式进化（10/30 行动闭环 + 灰化治愈 + 收集元素）
 * - 离线行为计算
 */

import { usePetStore } from '../stores/petStore';
import { useChatStore } from '../stores/chatStore';
import type { Pet, PetStage, EmotionType } from '../types';

/** 能量衰减阈值 */
const ENERGY_DAILY_DECAY = 10;
const GRAYING_TRIGGER_DAYS = 3;
const GRAYING_MAX_SEVERITY = 5;
const EVOLUTION_STAGE1_ACTIONS = 10;
const EVOLUTION_STAGE2_ACTIONS = 30;

/** 负面情绪集合 */
const NEGATIVE_EMOTIONS: EmotionType[] = ['sad', 'anxious', 'angry'];

/** 计算两个日期相差的天数 */
function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** 计算小时差 */
function hoursBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60));
}

/**
 * 计算连续负面情绪天数
 * 从聊天记录中分析最近几天用户情绪是否持续负面
 */
function calculateConsecutiveNegativeDays(): number {
  const messages = useChatStore.getState().messages;
  if (messages.length === 0) return 0;

  const now = new Date();
  let consecutiveDays = 0;

  // 从今天往前检查，每天是否有负面情绪记录
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - dayOffset);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // 获取当天的消息
    const dayMessages = messages.filter((m) => {
      const msgDate = new Date(m.createdAt);
      return msgDate >= dayStart && msgDate < dayEnd;
    });

    if (dayMessages.length === 0) {
      // 没有消息的天不算负面
      if (dayOffset === 0) continue; // 今天没消息跳过
      break;
    }

    // 检查当天是否有负面情绪
    const hasNegative = dayMessages.some(
      (m) => m.emotionTag && NEGATIVE_EMOTIONS.includes(m.emotionTag)
    );

    if (hasNegative) {
      consecutiveDays++;
    } else {
      // 当天没有负面情绪，中断连续计数
      if (dayOffset > 0) break; // 今天没有负面情绪不影响计数
    }
  }

  return consecutiveDays;
}

/**
 * 应用离线养成逻辑
 * 在用户重新打开 App 时调用
 */
export function applyOfflineProgression(): {
  energyLost: number;
  grayingTriggered: boolean;
  evolved: boolean;
  newStage?: PetStage;
} {
  const store = usePetStore.getState();
  const pet = store.pet;
  if (!pet) {
    return { energyLost: 0, grayingTriggered: false, evolved: false };
  }

  const now = new Date();
  const lastInteraction = pet.lastInteraction ? new Date(pet.lastInteraction) : new Date(pet.createdAt);
  const daysPassed = daysBetween(lastInteraction, now);
  const hoursPassed = hoursBetween(lastInteraction, now);

  let energyLost = 0;
  let grayingTriggered = false;
  let evolved = false;
  let newStage: PetStage | undefined;

  // 1. 能量自然衰减（按天计算）
  if (daysPassed > 0) {
    energyLost = Math.min(daysPassed * ENERGY_DAILY_DECAY, pet.energyLevel);
    store.updateEnergy(-energyLost);
  }

  // 2. 灰化症触发（连续3天情绪负面，而非仅未互动）
  const consecutiveNegativeDays = calculateConsecutiveNegativeDays();
  if (consecutiveNegativeDays >= GRAYING_TRIGGER_DAYS && !pet.isGraying && !pet.isDormant) {
    const severity = Math.min(
      GRAYING_MAX_SEVERITY,
      consecutiveNegativeDays - GRAYING_TRIGGER_DAYS + 1
    );
    store.setGraying(true, severity);
    grayingTriggered = true;
  }

  // 3. 长时间未互动 → 休眠（超过 7 天）
  if (daysPassed >= 7 && !pet.isDormant) {
    store.setDormant(true);
  } else if (hoursPassed < 24 && pet.isDormant) {
    store.setDormant(false);
  }

  // 4. 进化检查（完整条件：行动闭环数 + 灰化治愈 + 收集元素）
  if (
    pet.actionClosureCount >= EVOLUTION_STAGE2_ACTIONS &&
    pet.stageNumber < 3 &&
    pet.grayingHealed &&
    pet.collectibles.length >= 5
  ) {
    newStage = 'divine';
    store.setStage(newStage, 3);
    evolved = true;
  } else if (
    pet.actionClosureCount >= EVOLUTION_STAGE1_ACTIONS &&
    pet.stageNumber < 2 &&
    pet.grayingHealed
  ) {
    newStage = 'adult';
    store.setStage(newStage, 2);
    evolved = true;
  }

  return { energyLost, grayingTriggered, evolved, newStage };
}

/**
 * 检查是否应该触发灰化症
 * 在 App 启动时调用
 */
export function checkGrayingStatus(): boolean {
  const pet = usePetStore.getState().pet;
  if (!pet || pet.isGraying) return false;

  const consecutiveNegativeDays = calculateConsecutiveNegativeDays();

  if (consecutiveNegativeDays >= GRAYING_TRIGGER_DAYS) {
    const severity = Math.min(
      GRAYING_MAX_SEVERITY,
      consecutiveNegativeDays - GRAYING_TRIGGER_DAYS + 1
    );
    usePetStore.getState().setGraying(true, severity);
    return true;
  }

  return false;
}

/**
 * 检查进化条件（完整条件：行动闭环数 + 灰化治愈 + 收集元素）
 */
export function checkEvolution(): boolean {
  const pet = usePetStore.getState().pet;
  if (!pet) return false;

  // 伴生→觉醒：30行动闭环 + 已治愈灰化 + 收集5个元素
  if (
    pet.actionClosureCount >= EVOLUTION_STAGE2_ACTIONS &&
    pet.stageNumber < 3 &&
    pet.grayingHealed &&
    pet.collectibles.length >= 5
  ) {
    usePetStore.getState().setStage('divine', 3);
    return true;
  }
  // 幼崽→伴生：10行动闭环 + 已治愈灰化
  if (
    pet.actionClosureCount >= EVOLUTION_STAGE1_ACTIONS &&
    pet.stageNumber < 2 &&
    pet.grayingHealed
  ) {
    usePetStore.getState().setStage('adult', 2);
    return true;
  }
  return false;
}

/**
 * 获取宠物当前状态描述
 */
export function getPetStatusDescription(pet: Pet): {
  energyStatus: 'healthy' | 'tired' | 'weak';
  grayingStatus: 'none' | 'mild' | 'severe';
  evolutionProgress: { current: number; required: number; stage: PetStage };
} {
  const energyStatus =
    pet.energyLevel > 70 ? 'healthy' : pet.energyLevel > 30 ? 'tired' : 'weak';

  const grayingStatus = !pet.isGraying
    ? 'none'
    : pet.grayingSeverity <= 2
    ? 'mild'
    : 'severe';

  const nextStageActions =
    pet.stageNumber === 1
      ? EVOLUTION_STAGE1_ACTIONS
      : pet.stageNumber === 2
      ? EVOLUTION_STAGE2_ACTIONS
      : EVOLUTION_STAGE2_ACTIONS;

  return {
    energyStatus,
    grayingStatus,
    evolutionProgress: {
      current: pet.actionClosureCount,
      required: nextStageActions,
      stage: pet.currentStage,
    },
  };
}

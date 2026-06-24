/**
 * 咕噜 Gulu — 宠物 Store
 * 管理宠物状态、能量、灰化、进化
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pet, PetStage, StyleType, PetEmotion, FeedType, HealAction, Food } from '../types';
import { EVOLUTION_THRESHOLDS, STAGE_LIMITS, INTIMACY_DECAY } from '../constants/evolution';

interface PetState {
  pet: Pet | null;
  basicFoodsFedToday: number;
  lastBasicFoodResetAt: string;
  setPet: (pet: Pet) => void;
  updateEnergy: (delta: number) => void;
  feed: (type: FeedType) => void;
  updateStamina: (delta: number) => void;
  updateIntimacy: (delta: number) => void;
  updateTotalEnergy: (delta: number) => void;
  feedFood: (food: Food) => { staminaGain: number; intimacyGain: number };
  checkEvolution: () => { canEvolve: boolean; toStage?: 1 | 2 | 3; reason?: string };
  evolve: () => { success: boolean; fromStage?: number; toStage?: number };
  calculateIntimacyDecay: () => number;
  applyIntimacyDecay: () => void;
  setGraying: (isGraying: boolean, severity: number) => void;
  heal: (action: HealAction) => void;
  setEmotion: (emotion: PetEmotion) => void;
  setStyle: (style: StyleType) => void;
  setStage: (stage: PetStage, stageNumber: 1 | 2 | 3) => void;
  incrementActionClosure: () => void;
  addCollectible: (item: string) => void;
  setDormant: (isDormant: boolean) => void;
  updateLastInteraction: () => void;
  initializePetStats: () => void;
  /** 检查并尝试消耗一份每日基础食物，返回是否成功 */
  feedBasicFood: () => boolean;
  /** 添加偏好食物（装备食物时调用） */
  addPreferredFood: (foodId: string) => void;
}

/** 喂食能量加成 */
const FEED_ENERGY: Record<FeedType, number> = {
  sunlight: 20,
  moonlight: 20,
  soul_feast: 50,
  forget_grass: 30,
};

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      pet: null,
      basicFoodsFedToday: 0,
      lastBasicFoodResetAt: new Date().toISOString(),
      setPet: (pet) => set({ pet }),
      updateEnergy: (delta) =>
        set((state) => {
          if (!state.pet) return state;
          const newEnergy = Math.max(0, Math.min(state.pet.maxEnergy, state.pet.energyLevel + delta));
          return { pet: { ...state.pet, energyLevel: newEnergy } };
        }),
      feed: (type) =>
        set((state) => {
          if (!state.pet) return state;
          const gain = FEED_ENERGY[type];
          const newEnergy = Math.min(state.pet.maxEnergy, state.pet.energyLevel + gain);
          return {
            pet: {
              ...state.pet,
              energyLevel: newEnergy,
              currentEmotion: 'happy',
              lastInteraction: new Date().toISOString(),
              lastInteractionAt: new Date().toISOString(),
            },
          };
        }),
      updateStamina: (delta) =>
        set((state) => {
          if (!state.pet) return state;
          const newStamina = Math.max(0, Math.min(state.pet.maxStamina, state.pet.stamina + delta));
          return { pet: { ...state.pet, stamina: newStamina } };
        }),
      updateIntimacy: (delta) =>
        set((state) => {
          if (!state.pet) return state;
          const newIntimacy = Math.max(0, Math.min(state.pet.maxIntimacy, state.pet.intimacy + delta));
          return {
            pet: {
              ...state.pet,
              intimacy: newIntimacy,
              lastInteractionAt: new Date().toISOString(),
            },
          };
        }),
      updateTotalEnergy: (delta) =>
        set((state) => {
          if (!state.pet) return state;
          const newEnergy = Math.max(0, Math.min(state.pet.maxTotalEnergy, state.pet.totalEnergy + delta));
          return { pet: { ...state.pet, totalEnergy: newEnergy } };
        }),
      feedFood: (food) => {
        let result = { staminaGain: 0, intimacyGain: 0 };
        set((state) => {
          if (!state.pet) return state;
          const isPreferred = state.pet.preferredFoods.includes(food.id);
          const preferenceBonus = isPreferred ? (food.quality === 'rare' ? 0.5 : food.quality === 'good' ? 0.4 : 0.3) : 0;
          const staminaGain = Math.floor(food.staminaRestore * (isPreferred ? 1.3 : 1));
          const intimacyGain = Math.floor(food.intimacyBase * (1 + preferenceBonus));
          result = { staminaGain, intimacyGain };
          const newStamina = Math.min(state.pet.maxStamina, state.pet.stamina + staminaGain);
          const newIntimacy = Math.min(state.pet.maxIntimacy, state.pet.intimacy + intimacyGain);
          return {
            pet: {
              ...state.pet,
              stamina: newStamina,
              intimacy: newIntimacy,
              currentEmotion: 'happy',
              lastInteraction: new Date().toISOString(),
              lastInteractionAt: new Date().toISOString(),
            },
          };
        });
        return result;
      },
      checkEvolution: () => {
        const pet = get().pet;
        if (!pet) return { canEvolve: false, reason: '还没有咕噜哦' };
        if (pet.stageNumber >= 3) return { canEvolve: false, reason: '咕噜已经到达灵魂体啦' };
        const currentStage = pet.stageNumber as 1 | 2;
        const threshold = EVOLUTION_THRESHOLDS[currentStage];
        const limits = STAGE_LIMITS[currentStage];
        const staminaMet = pet.stamina >= limits.stamina * threshold.staminaPercent;
        const intimacyMet = pet.intimacy >= threshold.intimacy;
        const energyMet = pet.totalEnergy >= threshold.energy;
        if (staminaMet && intimacyMet && energyMet) {
          return { canEvolve: true, toStage: (pet.stageNumber + 1) as 1 | 2 | 3 };
        }
        const reasons: string[] = [];
        if (!staminaMet) reasons.push('体力还不够充沛');
        if (!intimacyMet) reasons.push('亲密度还需要积累');
        if (!energyMet) reasons.push('能量还需要积累');
        return { canEvolve: false, reason: reasons.join('，') };
      },
      evolve: () => {
        let result: { success: boolean; fromStage?: number; toStage?: number } = { success: false };
        set((state) => {
          if (!state.pet) return state;
          const check = get().checkEvolution();
          if (!check.canEvolve || !check.toStage) return state;
          const fromStage = state.pet.stageNumber;
          const limits = STAGE_LIMITS[check.toStage];
          result = { success: true, fromStage, toStage: check.toStage };
          const stageMap: Record<number, PetStage> = { 1: 'baby', 2: 'adult', 3: 'divine' };
          return {
            pet: {
              ...state.pet,
              currentStage: stageMap[check.toStage],
              stageNumber: check.toStage,
              maxStamina: limits.stamina,
              maxIntimacy: limits.intimacy,
              maxTotalEnergy: limits.energy,
            },
          };
        });
        return result;
      },
      calculateIntimacyDecay: () => {
        const pet = get().pet;
        if (!pet || !pet.lastInteractionAt) return 0;
        const last = new Date(pet.lastInteractionAt).getTime();
        const now = Date.now();
        const hours = (now - last) / (1000 * 60 * 60);
        if (hours <= INTIMACY_DECAY.graceHours) return 0;
        let days = 0;
        if (hours <= INTIMACY_DECAY.mildHours) {
          days = (hours - INTIMACY_DECAY.graceHours) / 24;
          return pet.intimacy * INTIMACY_DECAY.mildRate * days;
        }
        const mildDays = (INTIMACY_DECAY.mildHours - INTIMACY_DECAY.graceHours) / 24;
        const acceleratedDays = (hours - INTIMACY_DECAY.mildHours) / 24;
        const mildDecay = pet.intimacy * INTIMACY_DECAY.mildRate * mildDays;
        const currentAfterMild = pet.intimacy - mildDecay;
        const acceleratedDecay = currentAfterMild * INTIMACY_DECAY.acceleratedRate * acceleratedDays;
        return mildDecay + acceleratedDecay;
      },
      applyIntimacyDecay: () =>
        set((state) => {
          if (!state.pet) return state;
          const decay = get().calculateIntimacyDecay();
          if (decay <= 0) return state;
          const newIntimacy = Math.max(0, state.pet.intimacy - Math.floor(decay));
          return { pet: { ...state.pet, intimacy: newIntimacy } };
        }),
      initializePetStats: () =>
        set((state) => {
          if (!state.pet) return state;
          if (state.pet.maxStamina && state.pet.maxIntimacy && state.pet.maxTotalEnergy) {
            return state;
          }
          return {
            pet: {
              ...state.pet,
              stamina: state.pet.stamina ?? 100,
              maxStamina: state.pet.maxStamina ?? 100,
              intimacy: state.pet.intimacy ?? 0,
              maxIntimacy: state.pet.maxIntimacy ?? 300,
              totalEnergy: state.pet.totalEnergy ?? 0,
              maxTotalEnergy: state.pet.maxTotalEnergy ?? 500,
              preferredFoods: state.pet.preferredFoods ?? [],
            },
          };
        }),
      setGraying: (isGraying, severity) =>
        set((state) => ({
          pet: state.pet
            ? {
                ...state.pet,
                isGraying,
                grayingSeverity: severity,
                currentEmotion: isGraying ? 'graying' : state.pet.currentEmotion,
                grayingExperienced: state.pet.grayingExperienced || isGraying,
              }
            : null,
        })),
      heal: (_action) =>
        set((state) => {
          if (!state.pet || !state.pet.isGraying) return state;
          const newSeverity = Math.max(0, state.pet.grayingSeverity - 1);
          const healed = newSeverity === 0;
          return {
            pet: {
              ...state.pet,
              grayingSeverity: newSeverity,
              isGraying: !healed,
              grayingHealed: state.pet.grayingHealed || healed,
              currentEmotion: healed ? 'normal' : 'graying',
            },
          };
        }),
      setEmotion: (emotion) =>
        set((state) => ({
          pet: state.pet ? { ...state.pet, currentEmotion: emotion } : null,
        })),
      setStyle: (style) =>
        set((state) => ({
          pet: state.pet ? { ...state.pet, style } : null,
        })),
      setStage: (stage, stageNumber) =>
        set((state) => ({
          pet: state.pet ? { ...state.pet, currentStage: stage, stageNumber } : null,
        })),
      incrementActionClosure: () =>
        set((state) => ({
          pet: state.pet
            ? { ...state.pet, actionClosureCount: state.pet.actionClosureCount + 1 }
            : null,
        })),
      addCollectible: (item) =>
        set((state) => ({
          pet: state.pet
            ? {
                ...state.pet,
                collectibles: state.pet.collectibles.includes(item)
                  ? state.pet.collectibles
                  : [...state.pet.collectibles, item],
              }
            : null,
        })),
      setDormant: (isDormant) =>
        set((state) => ({
          pet: state.pet ? { ...state.pet, isDormant } : null,
        })),
      updateLastInteraction: () =>
        set((state) => ({
          pet: state.pet
            ? {
                ...state.pet,
                lastInteraction: new Date().toISOString(),
                lastInteractionAt: new Date().toISOString(),
              }
            : null,
        })),

      feedBasicFood: () => {
        const state = get();
        const today = new Date().toDateString();
        const lastReset = new Date(state.lastBasicFoodResetAt).toDateString();
        let currentCount = state.basicFoodsFedToday;
        if (today !== lastReset) {
          currentCount = 0;
        }
        if (currentCount >= 3) return false;
        set({
          basicFoodsFedToday: currentCount + 1,
          lastBasicFoodResetAt: new Date().toISOString(),
        });
        return true;
      },

      addPreferredFood: (foodId) =>
        set((state) => ({
          pet: state.pet
            ? {
                ...state.pet,
                preferredFoods: state.pet.preferredFoods.includes(foodId)
                  ? state.pet.preferredFoods
                  : [...state.pet.preferredFoods, foodId],
              }
            : null,
        })),
    }),
    {
      name: 'gulu-pet-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

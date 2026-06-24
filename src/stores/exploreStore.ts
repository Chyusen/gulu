/**
 * 咕噜 Gulu — 探索 Store
 * 管理探索隐私设置与宠物自主探索状态
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExplorePrivacy, AutoExploreState, GuluWhisper } from '../types';
import { AUTO_EXPLORE_STAMINA_PER_HOUR } from '../constants/evolution';
import { usePetStore } from './petStore';
import { useCurrencyStore } from './currencyStore';
import { MOCK_GULU_WHISPERS } from '../mocks/guluWhispers';

interface ExploreState {
  privacy: ExplorePrivacy;
  autoExplore: AutoExploreState;
  isFirstVisit: boolean;
  whispers: GuluWhisper[];
  updatePrivacy: (privacy: Partial<ExplorePrivacy>) => void;
  setFirstVisitDone: () => void;
  startAutoExplore: (duration: number, stageNumber: 1 | 2 | 3) => boolean;
  completeAutoExplore: () => GuluWhisper | null;
  checkAutoExploreComplete: () => GuluWhisper | null;
  clearWhispers: () => void;
}

function calculateRewards(duration: number, stageNumber: 1 | 2 | 3) {
  // 萌芽体/成长体/灵魂体 奖励递增
  const baseMultiplier = stageNumber;
  const guluCoin = Math.floor(10 * duration * baseMultiplier);
  const energy = Math.floor(15 * duration * baseMultiplier);
  return { guluCoin, energy };
}

function pickWhisper(personalityType: string): GuluWhisper {
  const isSocial = /外向|活泼|热情|开朗|社交/.test(personalityType);
  const pool = isSocial ? MOCK_GULU_WHISPERS.social : MOCK_GULU_WHISPERS.solo;
  const template = pool[Math.floor(Math.random() * pool.length)];
  const pet = usePetStore.getState().pet;
  return {
    id: `whisper_${Date.now()}`,
    petId: pet?.id ?? '',
    story: template,
    personalityTag: isSocial ? 'social' : 'solo',
    createdAt: new Date().toISOString(),
  };
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
      privacy: {
        showGender: false,
        showMBTI: false,
        showZodiac: false,
      },
      autoExplore: {
        isExploring: false,
      },
      isFirstVisit: true,
      whispers: [],

      updatePrivacy: (privacy) =>
        set((state) => ({ privacy: { ...state.privacy, ...privacy } })),

      setFirstVisitDone: () => set({ isFirstVisit: false }),

      startAutoExplore: (duration, stageNumber) => {
        const pet = usePetStore.getState().pet;
        if (!pet) return false;

        const staminaPerHour = AUTO_EXPLORE_STAMINA_PER_HOUR[stageNumber];
        const estimatedStaminaCost = staminaPerHour * duration;

        if (pet.stamina < estimatedStaminaCost) {
          return false;
        }

        usePetStore.getState().updateStamina(-estimatedStaminaCost);

        set({
          autoExplore: {
            isExploring: true,
            startedAt: new Date().toISOString(),
            duration,
            estimatedStaminaCost,
          },
        });
        return true;
      },

      completeAutoExplore: () => {
        const { autoExplore } = get();
        if (!autoExplore.isExploring) return null;

        const pet = usePetStore.getState().pet;
        if (!pet) return null;

        const duration = autoExplore.duration ?? 1;
        const rewards = calculateRewards(duration, pet.stageNumber);
        useCurrencyStore.getState().addGuluCoin(rewards.guluCoin);
        usePetStore.getState().updateTotalEnergy(rewards.energy);
        usePetStore.getState().updateIntimacy(Math.floor(5 * duration));
        usePetStore.getState().updateLastInteraction();

        const whisper = pickWhisper(pet.personalityType);
        set((state) => ({
          autoExplore: { isExploring: false },
          whispers: [whisper, ...state.whispers],
        }));

        return whisper;
      },

      checkAutoExploreComplete: () => {
        const { autoExplore } = get();
        if (!autoExplore.isExploring || !autoExplore.startedAt || !autoExplore.duration) {
          return null;
        }

        const startedAt = new Date(autoExplore.startedAt).getTime();
        const elapsedHours = (Date.now() - startedAt) / (1000 * 60 * 60);
        if (elapsedHours < autoExplore.duration) {
          return null;
        }

        return get().completeAutoExplore();
      },

      clearWhispers: () => set({ whispers: [] }),
    }),
    {
      name: 'gulu-explore-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

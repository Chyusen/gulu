/**
 * 咕噜 Gulu — 引导流程状态管理
 * 对应需求文档 2.3 引导流程状态管理
 * 使用 Zustand + persist 确保引导进度不丢失
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MBTIAnswer, StyleType } from '../types';

export type OnboardingStep =
  | 'welcome'
  | 'energyField'
  | 'cognitionPrism'
  | 'woundMirror'
  | 'fateCompass'
  | 'zodiac'
  | 'petCreate'
  | 'petBirth'
  | 'completed';

interface OnboardingState {
  currentStep: OnboardingStep;
  mbtiAnswers: MBTIAnswer[];
  selectedStyle: StyleType | null;
  customPrompt: string;
  petName: string;
  setStep: (step: OnboardingStep) => void;
  addMBTIAnswer: (answer: MBTIAnswer) => void;
  clearMBTIAnswers: () => void;
  setSelectedStyle: (style: StyleType | null) => void;
  setCustomPrompt: (prompt: string) => void;
  setPetName: (name: string) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 'completed',
      mbtiAnswers: [],
      selectedStyle: 'cute' as StyleType,
      customPrompt: '',
      petName: '咕噜',
      setStep: (currentStep) => set({ currentStep }),
      addMBTIAnswer: (answer) =>
        set((state) => ({
          mbtiAnswers: [...state.mbtiAnswers.filter((a) => a.questionId !== answer.questionId), answer],
        })),
      clearMBTIAnswers: () => set({ mbtiAnswers: [] }),
      setSelectedStyle: (selectedStyle) => set({ selectedStyle }),
      setCustomPrompt: (customPrompt) => set({ customPrompt }),
      setPetName: (petName) => set({ petName }),
      completeOnboarding: () => set({ currentStep: 'completed' }),
      reset: () =>
        set({
          currentStep: 'welcome',
          mbtiAnswers: [],
          selectedStyle: null,
          customPrompt: '',
          petName: '',
        }),
    }),
    {
      name: 'gulu-onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // 部署模式：跳过引导流程，直接进入主界面
        if (state) {
          state.currentStep = 'completed';
        }
      },
    }
  )
);

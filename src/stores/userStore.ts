/**
 * 咕噜 Gulu — 用户 Store
 * 管理用户画像与登录状态
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, MBTIType, ZodiacType, PrivacyLevel, EmotionType, GenderType } from '../types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  updateMBTI: (mbti: MBTIType) => void;
  updateZodiac: (zodiac: ZodiacType) => void;
  updateGender: (gender: GenderType) => void;
  updatePrivacyLevel: (level: PrivacyLevel) => void;
  updateEmotion: (emotion: EmotionType) => void;
  updateNickname: (nickname: string) => void;
  updateAvatar: (avatarUrl: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      updateMBTI: (mbti) =>
        set((state) => ({
          user: state.user ? { ...state.user, mbti } : null,
        })),
      updateZodiac: (zodiac) =>
        set((state) => ({
          user: state.user ? { ...state.user, zodiac } : null,
        })),
      updateGender: (gender) =>
        set((state) => ({
          user: state.user ? { ...state.user, gender } : null,
        })),
      updatePrivacyLevel: (privacyLevel) =>
        set((state) => ({
          user: state.user ? { ...state.user, privacyLevel } : null,
        })),
      updateEmotion: (currentEmotion) =>
        set((state) => ({
          user: state.user ? { ...state.user, currentEmotion } : null,
        })),
      updateNickname: (nickname) =>
        set((state) => ({
          user: state.user ? { ...state.user, nickname } : null,
        })),
      updateAvatar: (avatarUrl) =>
        set((state) => ({
          user: state.user ? { ...state.user, avatarUrl } : null,
        })),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'gulu-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

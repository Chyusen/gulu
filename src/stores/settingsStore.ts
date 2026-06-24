/**
 * 咕噜 Gulu — 设置 Store
 * 管理语音、通知、主题等设置
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VoiceType } from '../types';

interface SettingsState {
  voiceEnabled: boolean;
  voiceType: VoiceType;
  voiceSpeed: number;
  voicePitch: number;
  voiceVolume: number;
  notificationEnabled: boolean;
  isDarkMode: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceType: (type: VoiceType) => void;
  setVoiceSpeed: (speed: number) => void;
  setVoicePitch: (pitch: number) => void;
  setVoiceVolume: (volume: number) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      voiceEnabled: true,
      voiceType: 'cute_child',
      voiceSpeed: 1.0,
      voicePitch: 0,
      voiceVolume: 0.8,
      notificationEnabled: true,
      isDarkMode: false,
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setVoiceType: (voiceType) => set({ voiceType }),
      setVoiceSpeed: (voiceSpeed) => set({ voiceSpeed }),
      setVoicePitch: (voicePitch) => set({ voicePitch }),
      setVoiceVolume: (voiceVolume) => set({ voiceVolume }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setDarkMode: (isDarkMode) => set({ isDarkMode }),
    }),
    {
      name: 'gulu-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

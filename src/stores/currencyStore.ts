/**
 * 咕噜 Gulu — 货币 Store
 * 统一管理咕噜币与星尘余额，作为唯一货币数据源
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Currency } from '../types';

interface CurrencyState extends Currency {
  addGuluCoin: (amount: number) => void;
  spendGuluCoin: (amount: number) => boolean;
  addStarDust: (amount: number) => void;
  spendStarDust: (amount: number) => boolean;
  setCurrency: (currency: Partial<Currency>) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      guluCoin: 99999,
      // Demo 阶段给足星尘，方便测试更换形象功能
      starDust: 99999,
      addGuluCoin: (amount) =>
        set((state) => ({ guluCoin: Math.max(0, state.guluCoin + amount) })),
      spendGuluCoin: (amount) => {
        const current = get().guluCoin;
        if (current < amount) return false;
        set({ guluCoin: current - amount });
        return true;
      },
      addStarDust: (amount) =>
        set((state) => ({ starDust: Math.max(0, state.starDust + amount) })),
      spendStarDust: (amount) => {
        const current = get().starDust;
        if (current < amount) return false;
        set({ starDust: current - amount });
        return true;
      },
      setCurrency: (currency) => set(currency),
    }),
    {
      name: 'gulu-currency-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

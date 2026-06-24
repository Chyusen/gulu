/**
 * 咕噜 Gulu — 背包 Store
 * 管理用户物品、装备
 * 货币统一由 useCurrencyStore 管理，本 Store 只负责物品入库/装备
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserItem, ShopItem } from '../types';

interface InventoryState {
  inventory: UserItem[];
  /** 食物商店库存（foodId → 剩余库存，未初始化时读取 Food.stock 默认值） */
  foodStock: Record<string, number>;
  /** 添加物品到背包 */
  addItem: (item: ShopItem, quantity?: number) => void;
  /** 购买物品（仅入库存，调用方需先扣除货币） */
  purchase: (item: ShopItem) => void;
  /** 装备物品（同类型自动卸下） */
  equip: (itemId: string) => void;
  /** 卸下物品 */
  unequip: (itemId: string) => void;
  /** 消耗/减少物品数量 */
  consumeItem: (itemId: string, quantity?: number) => boolean;
  /** 获取食物当前商店库存（未初始化时回退到 defaultStock） */
  getFoodStock: (foodId: string, defaultStock: number) => number;
  /** 扣减食物商店库存，库存为 0 或无限库存(-1)时返回 false */
  decrementFoodStock: (foodId: string, defaultStock: number) => boolean;
  /** 重置 */
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      inventory: [],
      foodStock: {},

      addItem: (item, quantity = 1) => {
        const state = get();
        const now = new Date().toISOString();
        const existing = state.inventory.find((i) => i.itemId === item.id);
        let newInventory: UserItem[];

        if (existing) {
          newInventory = state.inventory.map((i) =>
            i.itemId === item.id
              ? { ...i, quantity: (i.quantity ?? 1) + quantity }
              : i
          );
        } else {
          newInventory = [
            ...state.inventory,
            {
              id: `inv_${Date.now()}`,
              userId: '',
              itemId: item.id,
              itemType: item.type,
              quantity,
              isEquipped: false,
              acquiredAt: now,
            },
          ];
        }

        set({ inventory: newInventory });
      },

      purchase: (item) => {
        get().addItem(item, 1);
      },

      equip: (itemId) =>
        set((state) => {
          const targetItem = state.inventory.find((i) => i.itemId === itemId);
          if (!targetItem) return state;
          const targetType = targetItem.itemType;

          return {
            inventory: state.inventory.map((i) => {
              if (i.itemId === itemId) {
                return { ...i, isEquipped: true };
              }
              if (i.isEquipped && targetType && i.itemType === targetType) {
                return { ...i, isEquipped: false };
              }
              return i;
            }),
          };
        }),

      unequip: (itemId) =>
        set((state) => ({
          inventory: state.inventory.map((i) =>
            i.itemId === itemId ? { ...i, isEquipped: false } : i
          ),
        })),

      consumeItem: (itemId, quantity = 1) => {
        const state = get();
        const item = state.inventory.find((i) => i.itemId === itemId);
        if (!item) return false;
        const currentQty = item.quantity ?? 1;
        if (currentQty < quantity) return false;

        set({
          inventory: state.inventory
            .map((i) =>
              i.itemId === itemId
                ? { ...i, quantity: currentQty - quantity }
                : i
            )
            .filter((i) => (i.quantity ?? 1) > 0),
        });
        return true;
      },

      getFoodStock: (foodId, defaultStock) => {
        const stored = get().foodStock[foodId];
        return stored !== undefined ? stored : defaultStock;
      },

      decrementFoodStock: (foodId, defaultStock) => {
        const state = get();
        // 无限库存（基础食物）不扣减也不阻止购买
        if (defaultStock < 0) return true;
        const current = state.foodStock[foodId] ?? defaultStock;
        if (current <= 0) return false;
        set({
          foodStock: {
            ...state.foodStock,
            [foodId]: current - 1,
          },
        });
        return true;
      },

      reset: () => set({ inventory: [], foodStock: {} }),
    }),
    {
      name: 'gulu-inventory-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

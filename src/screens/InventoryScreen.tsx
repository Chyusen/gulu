/**
 * 咕噜 Gulu — 背包界面
 * 对应需求文档 十、商业化系统 10.1.4 背包系统 / 10.1.5 装备系统
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import { useInventoryStore } from '../stores/inventoryStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { usePetStore } from '../stores/petStore';
import {
  getItemById,
  ITEM_TYPE_EMOJI,
  ITEM_TYPE_LABEL,
} from '../constants/shopItems';
import type { ItemType } from '../types';

type TabType = 'all' | ItemType;

export function InventoryScreen() {
  const { inventory, equip, unequip } = useInventoryStore();
  const { guluCoin, starDust } = useCurrencyStore();
  const pet = usePetStore((s) => s.pet);
  const addPreferredFood = usePetStore((s) => s.addPreferredFood);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const filteredInventory = activeTab === 'all'
    ? inventory
    : inventory.filter((i) => {
        const item = getItemById(i.itemId);
        return item?.type === activeTab;
      });

  const handleToggleEquip = (itemId: string, isEquipped: boolean) => {
    if (isEquipped) {
      unequip(itemId);
      Alert.alert('已卸下', '物品已卸下');
    } else {
      equip(itemId);
      Alert.alert('装备成功', '已装备该物品');
    }
  };

  const handleUseFood = (itemId: string) => {
    if (!pet) {
      Alert.alert('提示', '还没有宠物，无法使用');
      return;
    }
    const isPreferred = pet.preferredFoods.includes(itemId);
    if (isPreferred) {
      Alert.alert('提示', '该食物已经在偏好列表中了');
      return;
    }
    addPreferredFood(itemId);
    const item = getItemById(itemId);
    Alert.alert('使用成功', `已将 ${item?.name ?? '食物'} 添加到咕噜的偏好食物列表！`);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'food', label: '食物' },
    { key: 'accessory', label: '配饰' },
    { key: 'skin', label: '皮肤' },
    { key: 'scene', label: '场景' },
  ];

  return (
    <View style={styles.container}>
      {/* 货币栏 */}
      <View style={styles.currencyBar}>
        <View style={styles.currencyItem}>
          <Text style={styles.currencyEmoji}>🪙</Text>
          <Text style={styles.currencyValue}>{guluCoin} 咕噜币</Text>
        </View>
        <View style={styles.currencyItem}>
          <Text style={styles.currencyEmoji}>✨</Text>
          <Text style={styles.currencyValue}>{starDust} 星尘</Text>
        </View>
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredInventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎒</Text>
          <Text style={styles.emptyText}>背包空空如也</Text>
          <Text style={styles.emptyHint}>去商店购买物品吧～</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredInventory.map((userItem) => {
            const item = getItemById(userItem.itemId);
            if (!item) return null;

            const isEquippable =
              item.type === 'accessory' || item.type === 'skin' || item.type === 'scene';
            const isFood = item.type === 'food';
            const isPreferredFood = pet?.preferredFoods.includes(item.id) ?? false;

            return (
              <View key={userItem.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemEmoji}>
                    {ITEM_TYPE_EMOJI[item.type] ?? '📦'}
                  </Text>
                  {userItem.isEquipped && (
                    <View style={styles.equippedBadge}>
                      <Text style={styles.equippedBadgeText}>已装备</Text>
                    </View>
                  )}
                  {isFood && isPreferredFood && (
                    <View style={styles.preferredBadge}>
                      <Text style={styles.preferredBadgeText}>偏好</Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemType}>
                      {ITEM_TYPE_LABEL[item.type] ?? item.type}
                    </Text>
                    {userItem.quantity && userItem.quantity > 1 && (
                      <Text style={styles.itemQuantity}>×{userItem.quantity}</Text>
                    )}
                    {item.isLimited && (
                      <Text style={styles.limitedTag}>限定</Text>
                    )}
                  </View>
                </View>
                {isEquippable && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      userItem.isEquipped ? styles.unequipBtn : styles.equipBtn,
                    ]}
                    onPress={() => handleToggleEquip(item.id, userItem.isEquipped)}
                  >
                    <Text style={styles.actionBtnText}>
                      {userItem.isEquipped ? '卸下' : '装备'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isFood && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isPreferredFood ? styles.usedBtn : styles.useBtn,
                    ]}
                    onPress={() => handleUseFood(item.id)}
                    disabled={isPreferredFood}
                  >
                    <Text style={styles.actionBtnText}>
                      {isPreferredFood ? '已偏好' : '使用'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  currencyBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  currencyEmoji: {
    fontSize: 18,
  },
  currencyValue: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  itemHeader: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  itemEmoji: {
    fontSize: 40,
  },
  equippedBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  equippedBadgeText: {
    fontSize: 9,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  preferredBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  preferredBadgeText: {
    fontSize: 9,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemDesc: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  itemType: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  itemQuantity: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  limitedTag: {
    fontSize: 9,
    color: theme.colors.textInverse,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  equipBtn: {
    backgroundColor: theme.colors.primary,
  },
  unequipBtn: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  useBtn: {
    backgroundColor: theme.colors.success,
  },
  usedBtn: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  actionBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },
});

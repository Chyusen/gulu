/**
 * 咕噜 Gulu — 商店界面
 * 对应需求文档 3.1 双货币体系 / 2.5 食物偏好系统
 * 售卖食物、配饰、背景场景，偏好食物卡片左上角显示宠物头像
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import { SHOP_ITEMS } from '../constants/shopItems';
import { FOODS } from '../constants/foods';
import { FoodCard } from '../components/FoodCard';
import { PetAvatar } from '../components/PetAvatar';
import { AssetManager } from '../utils/AssetManager';
import { useInventoryStore } from '../stores/inventoryStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { usePetStore } from '../stores/petStore';
import type { ShopItem, Food, ItemType } from '../types';

type TabType = 'all' | ItemType;

type ShopListItem =
  | { kind: 'food'; data: Food }
  | { kind: 'item'; data: ShopItem };

const SCENE_IMAGE_MAP: Record<string, string> = {
  scene_sakura: 'sakura_courtyard',
  scene_forest: 'magic_forest',
  scene_sea: 'deep_sea_palace',
  scene_cloud: 'cloud_nest',
};

export function ShopScreen() {
  const { inventory, purchase, foodStock, decrementFoodStock } = useInventoryStore();
  const { guluCoin, starDust, spendGuluCoin, spendStarDust } = useCurrencyStore();
  const pet = usePetStore((s) => s.pet);
  const addItem = useInventoryStore((s) => s.addItem);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const filteredItems = React.useMemo(() => {
    const foodIds = new Set(FOODS.map((f) => f.id));
    const allItems: ShopListItem[] = [
      ...FOODS.filter((f) => !f.isBasic).map((food) => ({ kind: 'food' as const, data: food })),
      ...SHOP_ITEMS.filter((item) => !foodIds.has(item.id)).map((item) => ({ kind: 'item' as const, data: item })),
    ];
    if (activeTab === 'all') return allItems;
    if (activeTab === 'food') return allItems.filter((i) => i.kind === 'food');
    return allItems.filter((i) => i.kind === 'item' && i.data.type === activeTab);
  }, [activeTab]);

  const { leftColumn, rightColumn } = React.useMemo(() => {
    const left: ShopListItem[] = [];
    const right: ShopListItem[] = [];
    filteredItems.forEach((item, i) => {
      if (i % 2 === 0) left.push(item);
      else right.push(item);
    });
    return { leftColumn: left, rightColumn: right };
  }, [filteredItems]);

  const getShopStock = (food: Food) => foodStock[food.id] ?? food.stock ?? 0;
  const isInfiniteStock = (food: Food) => (food.stock ?? 0) < 0;

  const canAffordFood = (food: Food): boolean => guluCoin >= food.price;

  const handleBuyFood = (food: Food) => {
    const infinite = isInfiniteStock(food);
    const stock = getShopStock(food);
    if (!infinite && stock <= 0) {
      Alert.alert('已售罄', `${food.name} 已经卖完啦～`);
      return;
    }
    if (!canAffordFood(food)) {
      Alert.alert('咕噜币不足', `需要 ${food.price} 咕噜币才能购买 ${food.name}～`);
      return;
    }
    Alert.alert(
      '确认购买',
      `${food.emoji} ${food.name}\n价格：${food.price} 咕噜币\n效果：体力 +${food.staminaRestore} · 亲密 +${food.intimacyBase}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '购买',
          onPress: () => {
            const ok = spendGuluCoin(food.price);
            if (!ok) {
              Alert.alert('购买失败', '咕噜币不足哦～');
              return;
            }
            if (!infinite) {
              decrementFoodStock(food.id, food.stock ?? 0);
            }
            addItem(
              {
                id: food.id,
                name: food.name,
                type: 'food',
                price: food.price,
                currency: 'gulu_coin',
                description: food.description ?? '',
                isLimited: false,
              },
              1
            );
            Alert.alert('购买成功', `已获得 ${food.name}，快回主界面喂给咕噜吧～`);
          },
        },
      ]
    );
  };
  const handlePurchaseItem = (item: ShopItem) => {
    const canAfford =
      item.currency === 'star_dust' ? starDust >= item.price : guluCoin >= item.price;
    if (!canAfford) {
      const currencyLabel = item.currency === 'star_dust' ? '星尘' : '咕噜币';
      Alert.alert(`${currencyLabel}不足`, `需要更多${currencyLabel}才能购买此物品`);
      return;
    }
    Alert.alert(
      '确认购买',
      `${item.name}\n价格：${item.price} ${item.currency === 'star_dust' ? '星尘' : '咕噜币'}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '购买',
          onPress: () => {
            const ok =
              item.currency === 'star_dust'
                ? spendStarDust(item.price)
                : spendGuluCoin(item.price);
            if (ok) {
              purchase(item);
              Alert.alert('购买成功', `已获得 ${item.name}！`);
            } else {
              Alert.alert('购买失败', '请稍后再试');
            }
          },
        },
      ]
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'food', label: '食物' },
    { key: 'accessory', label: '饰品' },
    { key: 'scene', label: '背景' },
  ];

  const renderFoodItem = (food: Food) => {
    const infinite = isInfiniteStock(food);
    const stock = getShopStock(food);
    const soldOut = !infinite && stock <= 0;
    const isPreferred = pet?.preferredFoods.includes(food.id) ?? false;
    const petAvatar = pet && isPreferred ? (
      <PetAvatar
        stage={pet.currentStage}
        style={pet.style}
        state="normal"
        emotion="happy"
        size={28}
      />
    ) : null;
    return (
      <FoodCard
        food={food}
        quantity={infinite ? undefined : stock}
        isPreferred={isPreferred}
        petAvatar={petAvatar}
        style={styles.foodCardOverride}
        showPrice
        affordable={canAffordFood(food)}
        soldOut={soldOut}
        onPress={() => handleBuyFood(food)}
      />
    );
  };

  const renderItem = (item: ShopItem) => {
    const owned = inventory.find((i) => i.itemId === item.id);
    const affordable = item.currency === 'star_dust' ? starDust >= item.price : guluCoin >= item.price;
    const sceneKey = SCENE_IMAGE_MAP[item.id];
    const sceneImage = sceneKey ? AssetManager.getScene(sceneKey) : null;
    return (
      <View style={[styles.itemCard, !affordable && !owned && styles.itemCardDisabled]}>
        {sceneImage ? (
          <Image source={sceneImage} style={styles.sceneImage} />
        ) : (
          <View style={styles.itemIcon}>
            <Text style={styles.itemEmoji}>
              {item.type === 'food' ? '🍬' :
               item.type === 'accessory' ? '🎀' :
               item.type === 'skin' ? '🎨' : '🏞️'}
            </Text>
          </View>
        )}
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDesc}>{item.description}</Text>
        {item.isLimited && <Text style={styles.limitedTag}>限定</Text>}

        <View style={styles.itemFooter}>
          <View style={styles.priceRow}>
            <Image
              source={item.currency === 'star_dust'
                ? require('../assets/images/ui/icons/currency/stardust_icon.png')
                : require('../assets/images/ui/icons/currency/gulucoin_icon.png')}
              style={styles.priceIcon}
            />
            <Text style={styles.priceText}>
              {item.price} {item.currency === 'star_dust' ? '星尘' : '咕噜币'}
            </Text>
          </View>
          {owned ? (
            <View style={[styles.actionBtn, styles.actionBtnDisabled]}>
              <Text style={styles.actionBtnText}>已购买</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, !affordable && styles.actionBtnDisabled]}
              onPress={() => handlePurchaseItem(item)}
              disabled={!affordable}
            >
              <Text style={styles.actionBtnText}>购买</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderListItem = (item: ShopListItem) =>
    item.kind === 'food' ? renderFoodItem(item.data) : renderItem(item.data);

  const getItemKey = (item: ShopListItem) =>
    item.kind === 'food' ? `food-${item.data.id}` : `item-${item.data.id}`;

  return (
    <View style={styles.container}>
      <View style={styles.currencyBar}>
        <View style={styles.currencyItem}>
          <Image source={require('../assets/images/ui/icons/currency/gulucoin_icon.png')} style={styles.currencyIconImg} />
          <Text style={styles.currencyValue}>{guluCoin} 咕噜币</Text>
        </View>
        <View style={styles.currencyItem}>
          <Image source={require('../assets/images/ui/icons/currency/stardust_icon.png')} style={styles.currencyIconImg} />
          <Text style={styles.currencyValue}>{starDust} 星尘</Text>
        </View>
      </View>

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

      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.waterfall}>
          <View style={styles.column}>
            {leftColumn.map((item) => (
              <View key={getItemKey(item)} style={styles.cell}>
                {renderListItem(item)}
              </View>
            ))}
          </View>
          <View style={styles.column}>
            {rightColumn.map((item) => (
              <View key={getItemKey(item)} style={styles.cell}>
                {renderListItem(item)}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  currencyIconImg: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
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
  listContent: {
    padding: theme.spacing.sm,
  },
  waterfall: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  column: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  cell: {
    width: '100%',
  },
  foodCardOverride: {
    width: '100%',
    marginRight: 0,
  },
  itemCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    position: 'relative',
  },
  itemCardDisabled: {
    opacity: 0.5,
  },
  sceneImage: {
    width: '100%',
    height: 100,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  itemIcon: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  itemEmoji: {
    fontSize: 40,
  },
  itemName: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  itemDesc: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    minHeight: 30,
  },
  limitedTag: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    fontSize: 9,
    color: theme.colors.textInverse,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  priceText: {
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  actionBtnDisabled: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  equipBtn: {
    backgroundColor: theme.colors.success,
  },
  equippedBtn: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  actionBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },
  ownedText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
});
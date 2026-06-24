/**
 * 咕噜 Gulu — 商店 / 背包全屏弹窗
 * 合并原 ShopScreen 与 InventoryScreen，顶部 Tab 切换
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { theme } from '../../constants/theme';
import { SHOP_ITEMS, getItemById, ITEM_TYPE_EMOJI, ITEM_TYPE_LABEL } from '../../constants/shopItems';
import { FOODS, getFoodById } from '../../constants/foods';
import { FoodCard } from '../FoodCard';
import { PetAvatar } from '../PetAvatar';
import { AssetManager } from '../../utils/AssetManager';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { usePetStore } from '../../stores/petStore';
import type { ShopItem, Food, ItemType } from '../../types';

interface ShopInventoryModalProps {
  visible: boolean;
  onClose: () => void;
}

type MainTab = 'shop' | 'inventory';
type ShopTabType = 'all' | ItemType;
type InventoryTabType = 'all' | ItemType;

type ShopListItem =
  | { kind: 'food'; data: Food }
  | { kind: 'item'; data: ShopItem };

const SCENE_IMAGE_MAP: Record<string, string> = {
  scene_sakura: 'sakura_courtyard',
  scene_forest: 'magic_forest',
  scene_sea: 'deep_sea_palace',
  scene_cloud: 'cloud_nest',
};

const GULU_COIN_ICON = require('../../assets/images/ui/icons/currency/gulucoin_icon.png');
const STARDUST_ICON = require('../../assets/images/ui/icons/currency/stardust_icon.png');

export default function ShopInventoryModal({ visible, onClose: _onClose }: ShopInventoryModalProps) {
  const [mainTab, setMainTab] = useState<MainTab>('shop');

  // ========== Web 端原生 DOM Toast（绝对可靠，绕过 RN Web 渲染问题） ==========
  const isWeb = Platform.OS === 'web';
  const webToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (isWeb) {
      // Web 端：直接用 DOM API 创建 Toast，插入 body
      let toastEl = document.getElementById('gulu-shop-toast');
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'gulu-shop-toast';
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: ${type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)'};
        color: #fff;
        padding: 16px 28px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      if (webToastTimerRef.current) clearTimeout(webToastTimerRef.current);
      webToastTimerRef.current = setTimeout(() => {
        if (toastEl) {
          toastEl.style.opacity = '0';
          setTimeout(() => toastEl?.remove(), 300);
        }
      }, 2500);
      return;
    }
    // Native 端：用系统 Alert
    Alert.alert(type === 'success' ? '成功' : '提示', msg);
  }, [isWeb]);

  React.useEffect(() => {
    return () => {
      if (webToastTimerRef.current) {
        clearTimeout(webToastTimerRef.current);
      }
      const toastEl = document.getElementById('gulu-shop-toast');
      if (toastEl) toastEl.remove();
    };
  }, []);

  // ========== 商店状态与逻辑 ==========
  const { inventory, purchase, foodStock, decrementFoodStock, addItem, equip, unequip } = useInventoryStore();
  const { guluCoin, starDust, spendGuluCoin, spendStarDust } = useCurrencyStore();
  const pet = usePetStore((s) => s.pet);
  const addPreferredFood = usePetStore((s) => s.addPreferredFood);

  const [shopTab, setShopTab] = useState<ShopTabType>('all');

  const filteredShopItems = React.useMemo(() => {
    const foodIds = new Set(FOODS.map((f) => f.id));
    const allItems: ShopListItem[] = [
      ...FOODS.filter((f) => !f.isBasic).map((food) => ({ kind: 'food' as const, data: food })),
      ...SHOP_ITEMS.filter((item) => !foodIds.has(item.id)).map((item) => ({ kind: 'item' as const, data: item })),
    ];
    if (shopTab === 'all') return allItems;
    if (shopTab === 'food') return allItems.filter((i) => i.kind === 'food');
    return allItems.filter((i) => i.kind === 'item' && i.data.type === shopTab);
  }, [shopTab]);

  const { leftColumn, rightColumn } = React.useMemo(() => {
    const left: ShopListItem[] = [];
    const right: ShopListItem[] = [];
    filteredShopItems.forEach((item, i) => {
      if (i % 2 === 0) left.push(item);
      else right.push(item);
    });
    return { leftColumn: left, rightColumn: right };
  }, [filteredShopItems]);

  const getShopStock = (food: Food) => foodStock[food.id] ?? food.stock ?? 0;
  const isInfiniteStock = (food: Food) => (food.stock ?? 0) < 0;
  const canAffordFood = (food: Food): boolean => guluCoin >= food.price;

  const handleBuyFood = (food: Food) => {
    // eslint-disable-next-line no-console
    console.log('[ShopInventoryModal] handleBuyFood called', food.name, Platform.OS, typeof document);
    const infinite = isInfiniteStock(food);
    const stock = getShopStock(food);
    if (!infinite && stock <= 0) {
      showToast(`${food.name} 已经卖完啦～`, 'error');
      return;
    }
    if (!canAffordFood(food)) {
      showToast(`需要 ${food.price} 咕噜币才能购买 ${food.name}～`, 'error');
      return;
    }

    // 直接购买（不弹确认框，避免 window.confirm 导致 React error）
    const ok = spendGuluCoin(food.price);
    if (!ok) {
      showToast('咕噜币不足哦～', 'error');
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
    const msg = `购买成功！已获得 ${food.name}，已加入背包～`;
    // eslint-disable-next-line no-console
    console.log('[ShopInventoryModal] about to create toast', Platform.OS === 'web', typeof document);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const toastEl = document.createElement('div');
      toastEl.id = 'gulu-shop-toast';
      toastEl.textContent = msg;
      toastEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,197,94,0.95);color:#fff;padding:16px 28px;border-radius:12px;font-size:15px;font-weight:600;z-index:2147483647;box-shadow:0 8px 24px rgba(0,0,0,0.25);pointer-events:none;';
      document.body.appendChild(toastEl);
      setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 300); }, 2500);
    } else {
      showToast(msg, 'success');
    }
  };

  const handlePurchaseItem = (item: ShopItem) => {
    const canAfford =
      item.currency === 'star_dust' ? starDust >= item.price : guluCoin >= item.price;
    if (!canAfford) {
      const currencyLabel = item.currency === 'star_dust' ? '星尘' : '咕噜币';
      showToast(`${currencyLabel}不足，需要更多${currencyLabel}才能购买此物品`, 'error');
      return;
    }

    // 直接购买（不弹确认框，避免 window.confirm 导致 React error）
    const ok =
      item.currency === 'star_dust'
        ? spendStarDust(item.price)
        : spendGuluCoin(item.price);
    if (ok) {
      purchase(item);
      const msg = `购买成功！已获得 ${item.name}，已加入背包～`;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const toastEl = document.createElement('div');
        toastEl.id = 'gulu-shop-toast';
        toastEl.textContent = msg;
        toastEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,197,94,0.95);color:#fff;padding:16px 28px;border-radius:12px;font-size:15px;font-weight:600;z-index:2147483647;box-shadow:0 8px 24px rgba(0,0,0,0.25);pointer-events:none;';
        document.body.appendChild(toastEl);
        setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 300); }, 2500);
      } else {
        showToast(msg, 'success');
      }
    } else {
      showToast('购买失败，请稍后再试', 'error');
    }
  };

  const shopTabs: { key: ShopTabType; label: string }[] = [
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

  const renderShopItem = (item: ShopItem) => {
    const owned = inventory.find((i) => i.itemId === item.id);
    const affordable = item.currency === 'star_dust' ? starDust >= item.price : guluCoin >= item.price;
    const sceneKey = SCENE_IMAGE_MAP[item.id];
    const sceneImage = sceneKey ? AssetManager.getScene(sceneKey) : null;
    const accessoryIconKey = item.type === 'accessory' && item.imageUrl ? item.imageUrl : null;
    const accessoryIcon = accessoryIconKey ? AssetManager.getAccessoryIcon(accessoryIconKey) : null;
    const foodItem = item.type === 'food' ? FOODS.find((f) => f.id === item.id) : null;
    const foodIcon = foodItem?.imageUrl ? AssetManager.getFoodIcon(foodItem.imageUrl) : null;
    return (
      <View style={[styles.itemCard, !affordable && !owned && styles.itemCardDisabled]}>
        {sceneImage ? (
          <Image source={sceneImage} style={styles.sceneImage} />
        ) : accessoryIcon ? (
          <Image source={accessoryIcon} style={styles.itemIconImage} />
        ) : foodIcon ? (
          <Image source={foodIcon} style={styles.itemIconImage} />
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
              source={item.currency === 'star_dust' ? STARDUST_ICON : GULU_COIN_ICON}
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
    item.kind === 'food' ? renderFoodItem(item.data) : renderShopItem(item.data);

  const getShopItemKey = (item: ShopListItem) =>
    item.kind === 'food' ? `food-${item.data.id}` : `item-${item.data.id}`;

  // ========== 背包状态与逻辑 ==========
  const [inventoryTab, setInventoryTab] = useState<InventoryTabType>('all');

  const filteredInventory = inventoryTab === 'all'
    ? inventory
    : inventory.filter((i) => {
        const item = getItemById(i.itemId);
        return item?.type === inventoryTab;
      });

  const handleToggleEquip = (itemId: string, isEquipped: boolean) => {
    if (isEquipped) {
      unequip(itemId);
      showToast('物品已卸下', 'success');
    } else {
      equip(itemId);
      showToast('装备成功！已装备该物品', 'success');
    }
  };

  const handleUseFood = (itemId: string) => {
    if (!pet) {
      showToast('还没有宠物，无法使用', 'error');
      return;
    }
    const isPreferred = pet.preferredFoods.includes(itemId);
    if (isPreferred) {
      showToast('该食物已经在偏好列表中了', 'error');
      return;
    }
    addPreferredFood(itemId);
    const item = getItemById(itemId);
    showToast(`使用成功！已将 ${item?.name ?? '食物'} 添加到咕噜的偏好食物列表！`, 'success');
  };

  const inventoryTabs: { key: InventoryTabType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'food', label: '食物' },
    { key: 'accessory', label: '配饰' },
    { key: 'scene', label: '场景' },
  ];

  const renderShopContent = () => (
    <>
      <View style={styles.currencyBar}>
        <View style={styles.currencyItem}>
          <Image source={GULU_COIN_ICON} style={styles.currencyIconImg} />
          <Text style={styles.currencyValue}>{guluCoin} 咕噜币</Text>
        </View>
        <View style={styles.currencyItem}>
          <Image source={STARDUST_ICON} style={styles.currencyIconImg} />
          <Text style={styles.currencyValue}>{starDust} 星尘</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {shopTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, shopTab === tab.key && styles.tabActive]}
            onPress={() => setShopTab(tab.key)}
          >
            <Text style={[styles.tabText, shopTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.waterfall}>
          <View style={styles.column}>
            {leftColumn.map((item) => (
              <View key={getShopItemKey(item)} style={styles.cell}>
                {renderListItem(item)}
              </View>
            ))}
          </View>
          <View style={styles.column}>
            {rightColumn.map((item) => (
              <View key={getShopItemKey(item)} style={styles.cell}>
                {renderListItem(item)}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );

  const renderInventoryContent = () => (
    <>
      <View style={styles.currencyBar}>
        <View style={styles.currencyItem}>
          <Image source={GULU_COIN_ICON} style={styles.currencyIconImg} />
          <Text style={styles.currencyValue}>{guluCoin} 咕噜币</Text>
        </View>
        <View style={styles.currencyItem}>
          <Image source={STARDUST_ICON} style={styles.currencyIconImg} />
          <Text style={styles.currencyValue}>{starDust} 星尘</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {inventoryTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, inventoryTab === tab.key && styles.tabActive]}
            onPress={() => setInventoryTab(tab.key)}
          >
            <Text style={[styles.tabText, inventoryTab === tab.key && styles.tabTextActive]}>
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

            const inventoryIcon = isFood
              ? (getFoodById(item.id)?.imageUrl ? AssetManager.getFoodIcon(getFoodById(item.id)!.imageUrl!) : null)
              : item.type === 'accessory' && item.imageUrl
              ? AssetManager.getAccessoryIcon(item.imageUrl)
              : null;

            return (
              <View key={userItem.id} style={styles.inventoryItemCard}>
                <View style={styles.itemHeader}>
                  {inventoryIcon ? (
                    <Image source={inventoryIcon} style={styles.inventoryItemImage} />
                  ) : (
                    <Text style={styles.inventoryItemEmoji}>
                      {ITEM_TYPE_EMOJI[item.type] ?? '📦'}
                    </Text>
                  )}
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
                  <Text style={styles.inventoryItemName}>{item.name}</Text>
                  <Text style={styles.inventoryItemDesc}>{item.description}</Text>
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
    </>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* 一级 Tab：商店 / 背包 */}
      <View style={styles.mainTabBar}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'shop' && styles.mainTabActive]}
          onPress={() => setMainTab('shop')}
        >
          <Text style={[styles.mainTabText, mainTab === 'shop' && styles.mainTabTextActive]}>
            商店
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'inventory' && styles.mainTabActive]}
          onPress={() => setMainTab('inventory')}
        >
          <Text style={[styles.mainTabText, mainTab === 'inventory' && styles.mainTabTextActive]}>
            背包
          </Text>
        </TouchableOpacity>
      </View>

      {mainTab === 'shop' ? renderShopContent() : renderInventoryContent()}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  mainTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  mainTabActive: {
    backgroundColor: theme.colors.primary,
  },
  mainTabText: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  mainTabTextActive: {
    color: theme.colors.textInverse,
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
  itemIconImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
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
  actionBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.caption,
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
  inventoryItemCard: {
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
  inventoryItemEmoji: {
    fontSize: 40,
  },
  inventoryItemImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
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
  inventoryItemName: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  inventoryItemDesc: {
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
});

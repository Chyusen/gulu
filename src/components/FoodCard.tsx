/**
 * 咕噜 Gulu — 食物卡片
 * 展示食物图标、名称、效果、价格/库存
 * 偏好食物左上角显示宠物头像（或爱心标识回退）
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../constants/theme';
import { AssetManager } from '../utils/AssetManager';
import type { Food } from '../types';

interface FoodCardProps {
  food: Food;
  quantity?: number;
  isPreferred?: boolean;
  disabled?: boolean;
  soldOut?: boolean;
  subtitle?: string;
  onPress: () => void;
  style?: TouchableOpacity['props']['style'];
  petAvatar?: React.ReactNode;
  showPrice?: boolean;
  affordable?: boolean;
}

export function FoodCard({
  food,
  quantity,
  isPreferred,
  disabled,
  soldOut = false,
  subtitle,
  onPress,
  style,
  petAvatar,
  showPrice,
  affordable = true,
}: FoodCardProps) {
  const qualityColor =
    food.quality === 'rare'
      ? theme.colors.info
      : food.quality === 'good'
      ? theme.colors.emotionHappy
      : theme.colors.textSecondary;
  const cardDisabled = disabled || soldOut;
  const foodIcon = food.imageUrl ? AssetManager.getFoodIcon(food.imageUrl) : null;

  return (
    <TouchableOpacity
      style={[styles.card, cardDisabled && styles.cardDisabled, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={cardDisabled}
    >
      {isPreferred &&
        (petAvatar ? (
          <View style={styles.avatarBadge}>{petAvatar}</View>
        ) : (
          <View style={styles.loveBadge}>
            <Text style={styles.loveText}>❤️</Text>
          </View>
        ))}
      {foodIcon ? (
        <Image source={foodIcon} style={styles.foodImage} resizeMode="contain" />
      ) : (
        <Text style={styles.emoji}>{food.emoji}</Text>
      )}
      <Text style={styles.name}>{food.name}</Text>
      <Text style={[styles.quality, { color: qualityColor }]}>
        {food.quality === 'normal' ? '普通' : food.quality === 'good' ? '优良' : '稀有'}
      </Text>
      <Text style={styles.effect}>
        体力 +{food.staminaRestore} · 亲密 +{food.intimacyBase}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {quantity !== undefined && quantity > 0 && (
        <Text style={styles.quantity}>库存：{quantity}</Text>
      )}
      {showPrice && (
        <View style={styles.priceRow} pointerEvents="none">
          <Text style={[styles.priceText, (!affordable || soldOut) && styles.priceDisabled]}>
            {food.price} 咕噜币
          </Text>
          <View style={[styles.buyBtn, (!affordable || soldOut) && styles.buyBtnDisabled]}>
            <Text style={styles.buyBtnText}>{soldOut ? '已售罄' : '购买'}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.backgroundTertiary,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  avatarBadge: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: `${theme.colors.error}15`,
    borderRadius: theme.radius.full,
    padding: 2,
  },
  loveText: {
    fontSize: 10,
  },
  emoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  foodImage: {
    width: 48,
    height: 48,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quality: {
    fontSize: theme.fontSize.caption,
    marginTop: 2,
  },
  effect: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 4,
  },
  quantity: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    width: '100%',
  },
  priceText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  priceDisabled: {
    color: theme.colors.textTertiary,
  },
  buyBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  buyBtnDisabled: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  buyBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
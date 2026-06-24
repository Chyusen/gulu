/**
 * 咕噜 Gulu — 个人中心全屏视图
 * 对应需求文档 第六章
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useUserStore } from '../stores/userStore';
import { usePetStore } from '../stores/petStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { Background } from './Background';
import { theme } from '../constants/theme';

interface ProfileViewProps {
  onOpenShop: () => void;
}

export function ProfileView({ onOpenShop }: ProfileViewProps) {
  const user = useUserStore((s) => s.user);
  const pet = usePetStore((s) => s.pet);
  const { guluCoin, starDust } = useCurrencyStore();
  const updateAvatar = useUserStore((s) => s.updateAvatar);


  /** 点击头像上传自定义图片（Web 端使用 file input） */
  const handleAvatarPress = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            updateAvatar(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('提示', '当前 Demo 版本仅支持 Web 端上传头像');
    }
  };

  return (
    <Background name="profile">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 用户资料 */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.avatarCircle}
          onPress={handleAvatarPress}
          activeOpacity={0.8}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Image source={require('../assets/images/ui/avatars/default_avatar.png')} style={styles.avatarImage} />
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditBadgeText}>✎</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.nickname}>{user?.nickname ?? '未命名旅人'}</Text>
        <Text style={styles.userId}>ID: {user?.id?.slice(-8) ?? '--------'}</Text>
      </View>

      {/* 画像结果 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>灵魂画像</Text>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>MBTI</Text>
            <Text style={styles.tagValue}>{user?.mbti ?? '未测试'}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>星座</Text>
            <Text style={styles.tagValue}>{user?.zodiac ?? '未选择'}</Text>
          </View>
        </View>
        <Text style={styles.analysisText}>
          {user?.mbti && user?.zodiac
            ? `你是一位${user.mbti}型的${user.zodiac}灵魂，与${pet?.name ?? '咕噜'}的匹配度极高。`
            : '完成引导流程后，这里会显示你的专属灵魂画像。'}
        </Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>匹配分数 92</Text>
        </View>
      </View>

      {/* 背包与货币 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>背包与货币</Text>
        <View style={styles.currencyRow}>
          <View style={styles.currencyItem}>
            <Image source={require('../assets/images/ui/icons/currency/gulucoin_icon.png')} style={styles.currencyIconImg} />
            <Text style={styles.currencyLabel}>咕噜币</Text>
            <Text style={styles.currencyValue}>{guluCoin}</Text>
          </View>
          <View style={styles.currencyItem}>
            <Image source={require('../assets/images/ui/icons/currency/stardust_icon.png')} style={styles.currencyIconImg} />
            <Text style={styles.currencyLabel}>星尘</Text>
            <Text style={styles.currencyValue}>{starDust}</Text>
          </View>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>🎁</Text>
            <Text style={styles.currencyLabel}>道具</Text>
            <Text style={styles.currencyValue}>{pet?.collectibles.length ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* 设置入口 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>设置</Text>
        <TouchableOpacity style={styles.settingBtn} onPress={onOpenShop}>
          <Text style={styles.settingBtnText}>🛍️ 进入商店</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingBtn, styles.logoutBtn]}
          onPress={() => useUserStore.getState().logout()}
        >
          <Text style={styles.logoutBtnText}>退出登录</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  section: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.backgroundSecondary,
  },
  avatarEditBadgeText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    lineHeight: 14,
  },
  avatarText: {
    fontSize: 32,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  nickname: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  userId: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  sectionCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  tag: {
    flex: 1,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  tagText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  tagValue: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.primaryLight,
  },
  analysisText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${theme.colors.primary}33`,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  scoreText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.primaryLight,
    fontWeight: '600',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  currencyItem: {
    alignItems: 'center',
  },
  currencyIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  currencyIconImg: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginBottom: theme.spacing.xs,
  },
  currencyLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
  currencyValue: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  settingBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  settingBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: theme.colors.error,
    marginBottom: 0,
  },
  logoutBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
});

/**
 * 咕噜 Gulu — 个人中心
 * 对应需求文档 十一、个人中心
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../constants/theme';
import { useUserStore } from '../stores/userStore';
import { usePetStore } from '../stores/petStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { PetAvatar } from '../components/PetAvatar';
import type { VoiceType } from '../types';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useUserStore((s) => s.user);
  const pet = usePetStore((s) => s.pet);
  const logout = useUserStore((s) => s.logout);
  const updateAvatar = useUserStore((s) => s.updateAvatar);
  const settings = useSettingsStore();
  const { inventory } = useInventoryStore();
  const { guluCoin, starDust } = useCurrencyStore();

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>未登录</Text>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

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

  const voiceTypes: { type: VoiceType; label: string }[] = [
    { type: 'cute_child', label: '可爱童声' },
    { type: 'gentle_youth', label: '温柔少年' },
    { type: 'mature_adult', label: '成熟成人' },
    { type: 'playful_teen', label: '活泼少年' },
    { type: 'wise_elder', label: '睿智长者' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 用户信息卡片 */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarPlaceholder}
            onPress={handleAvatarPress}
            activeOpacity={0.8}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Image source={require('../assets/images/ui/avatars/default_avatar.png')} style={styles.avatarImage} />
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.userMeta}>
              {user.mbti ?? '未设置'} · {user.zodiac ?? '未设置'}
            </Text>
          </View>
        </View>

        {/* 宠物信息 */}
        {pet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>宠物信息</Text>
            <View style={styles.petCard}>
              <PetAvatar
                stage={pet.currentStage}
                style={pet.style}
                state="normal"
                size={80}
              />
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petMeta}>
                  {pet.currentStage === 'baby' ? '幼崽期' :
                   pet.currentStage === 'adult' ? '伴生期' : '觉醒期'} ·
                  能量 {pet.energyLevel}
                </Text>
                <Text style={styles.petMeta}>
                  行动闭环：{pet.actionClosureCount} 次
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 语音设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>语音设置</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>语音开关</Text>
            <TouchableOpacity
              style={[
                styles.switch,
                settings.voiceEnabled ? styles.switchOn : styles.switchOff,
              ]}
              onPress={() => settings.setVoiceEnabled(!settings.voiceEnabled)}
            >
              <View
                style={[
                  styles.switchThumb,
                  settings.voiceEnabled ? styles.switchThumbOn : styles.switchThumbOff,
                ]}
              />
            </TouchableOpacity>
          </View>
          {settings.voiceEnabled && (
            <View style={styles.voiceTypes}>
              {voiceTypes.map((vt) => (
                <TouchableOpacity
                  key={vt.type}
                  style={[
                    styles.voiceTypeBtn,
                    settings.voiceType === vt.type && styles.voiceTypeBtnSelected,
                  ]}
                  onPress={() => settings.setVoiceType(vt.type)}
                >
                  <Text
                    style={[
                      styles.voiceTypeText,
                      settings.voiceType === vt.type && styles.voiceTypeTextSelected,
                    ]}
                  >
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 隐私设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>隐私设置</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>隐私等级</Text>
            <Text style={styles.settingValue}>
              {user.privacyLevel === 1 ? '仅宠物+昵称' :
               user.privacyLevel === 2 ? '公开性别' : '仅宠物可见'}
            </Text>
          </View>
        </View>

        {/* 通知设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知设置</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>推送通知</Text>
            <TouchableOpacity
              style={[
                styles.switch,
                settings.notificationEnabled ? styles.switchOn : styles.switchOff,
              ]}
              onPress={() => settings.setNotificationEnabled(!settings.notificationEnabled)}
            >
              <View
                style={[
                  styles.switchThumb,
                  settings.notificationEnabled ? styles.switchThumbOn : styles.switchThumbOff,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 商店与背包 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商店与背包</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.settingLabel}>🛍️ 商店</Text>
            <Text style={styles.settingValue}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={styles.settingLabel}>🎒 背包</Text>
            <Text style={styles.settingValue}>{inventory.length} 件物品 ›</Text>
          </TouchableOpacity>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>🪙 咕噜币</Text>
            <Text style={styles.settingValue}>{guluCoin}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>✨ 星尘</Text>
            <Text style={styles.settingValue}>{starDust}</Text>
          </View>
        </View>

        {/* 关于 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>版本</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  avatarEditBadgeText: {
    fontSize: 10,
    color: theme.colors.textInverse,
    lineHeight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  userInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: theme.fontSize.headline,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  userMeta: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  petName: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  petMeta: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  settingLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  settingValue: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchOn: {
    backgroundColor: theme.colors.primary,
  },
  switchOff: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  voiceTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  voiceTypeBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  voiceTypeBtnSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  voiceTypeText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  voiceTypeTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
});

/**
 * 咕噜 Gulu — 首页
 * 对应需求文档：宠物主界面、能量场、喂食、互动
 * @deprecated 已被 MainScreen 取代（宠物中心式导航重构），不再通过 RootNavigator 路由。
 *             保留以供参考，新功能请在 MainScreen 中实现。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { PetAvatar } from '../components/PetAvatar';
import { EnergyBar } from '../components/EnergyBar';
import { theme } from '../constants/theme';
import { usePetStore } from '../stores/petStore';
import { useUserStore } from '../stores/userStore';
import type { FeedType, PetState } from '../types';

/** @deprecated 已被 MainScreen 取代 */
export function HomeScreen() {
  const pet = usePetStore((s) => s.pet);
  const feed = usePetStore((s) => s.feed);
  const updateLastInteraction = usePetStore((s) => s.updateLastInteraction);
  const user = useUserStore((s) => s.user);

  const [showFeedOptions, setShowFeedOptions] = useState(false);

  // 每日登录自动 +20 能量
  useEffect(() => {
    if (pet) {
      const today = new Date().toDateString();
      const lastFeed = pet.lastInteraction ? new Date(pet.lastInteraction).toDateString() : null;
      if (lastFeed !== today) {
        feed('sunlight');
      }
    }
  }, [feed, pet]);

  if (!pet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>还没有宠物</Text>
      </View>
    );
  }

  // 能量状态判断
  const energyStatus =
    pet.energyLevel > 70 ? '健康' : pet.energyLevel > 30 ? '疲惫' : '虚弱';

  // 宠物状态
  const petState: PetState = pet.isGraying
    ? 'graying'
    : pet.isDormant
    ? 'dormant'
    : pet.currentEmotion === 'happy'
    ? 'happy'
    : pet.currentEmotion === 'sad'
    ? 'sad'
    : 'normal';

  const handleFeed = (type: FeedType) => {
    if (type === 'soul_feast' && pet.actionClosureCount < 1) {
      Alert.alert('提示', '需要完成行动闭环后才能使用灵魂盛宴');
      return;
    }
    feed(type);
    setShowFeedOptions(false);
    updateLastInteraction();
    Alert.alert('咕噜', `${pet.name} 吃得很开心！能量 +${type === 'soul_feast' ? 50 : type === 'forget_grass' ? 30 : 20}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部问候 */}
        <View style={styles.header}>
          <Text style={styles.greeting}>你好，{user?.nickname ?? '主人'}</Text>
          <Text style={styles.petName}>{pet.name}</Text>
        </View>

        {/* 宠物展示区 */}
        <View style={styles.petContainer}>
          <PetAvatar
            stage={pet.currentStage}
            style={pet.style}
            state={petState}
            size={240}
            grayingSeverity={pet.grayingSeverity}
          />
          <Text style={styles.stageText}>
            {pet.currentStage === 'baby' ? '幼崽期' : pet.currentStage === 'adult' ? '伴生期' : '觉醒期'}
          </Text>
          {pet.isGraying && (
            <Text style={styles.warningText}>
              咕噜正在灰化（严重度 {pet.grayingSeverity}/5）
            </Text>
          )}
        </View>

        {/* 能量场 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>能量场</Text>
            <Text style={styles.energyValue}>
              {pet.energyLevel}/{pet.maxEnergy}
            </Text>
          </View>
          <EnergyBar energy={pet.energyLevel} maxEnergy={pet.maxEnergy} />
          <Text style={styles.statusText}>状态：{energyStatus}</Text>
        </View>

        {/* 行动统计 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pet.actionClosureCount}</Text>
            <Text style={styles.statLabel}>行动闭环</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pet.collectibles.length}</Text>
            <Text style={styles.statLabel}>收集元素</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {pet.currentStage === 'baby' ? '1' : pet.currentStage === 'adult' ? '2' : '3'}
            </Text>
            <Text style={styles.statLabel}>进化阶段</Text>
          </View>
        </View>

        {/* 喂食按钮 */}
        <TouchableOpacity
          style={styles.feedButton}
          onPress={() => setShowFeedOptions(!showFeedOptions)}
        >
          <Text style={styles.feedButtonText}>喂食咕噜</Text>
        </TouchableOpacity>

        {showFeedOptions && (
          <View style={styles.feedOptions}>
            <TouchableOpacity style={styles.feedOption} onPress={() => handleFeed('sunlight')}>
              <Text style={styles.feedOptionText}>日光 ☀️ (+20)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedOption} onPress={() => handleFeed('moonlight')}>
              <Text style={styles.feedOptionText}>月光 🌙 (+20)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedOption, pet.actionClosureCount < 1 && styles.feedOptionDisabled]}
              onPress={() => handleFeed('soul_feast')}
            >
              <Text style={styles.feedOptionText}>灵魂盛宴 ✨ (+50)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedOption} onPress={() => handleFeed('forget_grass')}>
              <Text style={styles.feedOptionText}>忘忧草 🌿 (+30)</Text>
            </TouchableOpacity>
          </View>
        )}
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
  header: {
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  petName: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  petContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  stageText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  warningText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  energyValue: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.headline,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  feedButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  feedButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
  },
  feedOptions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  feedOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  feedOptionDisabled: {
    opacity: 0.5,
  },
  feedOptionText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
});

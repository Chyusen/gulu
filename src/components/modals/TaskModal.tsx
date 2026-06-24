/**
 * 咕噜 Gulu — 任务弹窗内容
 * 合并每日任务 + 每周任务，左右 Tab 切换
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../constants/theme';
import { useTaskStore } from '../../stores/taskStore';
import { usePetStore } from '../../stores/petStore';
import { TaskCard } from '../TaskCard';

type TaskTab = 'daily' | 'weekly';

export function TaskModal() {
  const [activeTab, setActiveTab] = useState<TaskTab>('daily');
  const pet = usePetStore((s) => s.pet);

  const {
    dailyTasks,
    weeklyTasks,
    dailyStreak,
    dailyCompletionRate,
    checkAndReset,
    claimTaskReward,
    getDailyMultiplier,
    getWeeklyMultiplier,
  } = useTaskStore();

  useEffect(() => {
    checkAndReset((pet?.stageNumber ?? 1) as 1 | 2 | 3);
  }, [checkAndReset, pet?.stageNumber]);

  const dailyMultiplier = getDailyMultiplier();
  const weeklyMultiplier = getWeeklyMultiplier();

  const isDaily = activeTab === 'daily';
  const tasks = isDaily ? dailyTasks : weeklyTasks;
  const multiplier = isDaily ? dailyMultiplier : weeklyMultiplier;
  const rewardLabel = isDaily ? '🪙' : '✨';

  return (
    <View style={styles.container}>
      {/* Tab 切换 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, isDaily && styles.tabActive]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabText, isDaily && styles.tabTextActive]}>每日任务</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isDaily && styles.tabActive]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, !isDaily && styles.tabTextActive]}>每周任务</Text>
        </TouchableOpacity>
      </View>

      {/* 信息卡 */}
      <View style={styles.infoCard}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>
            {isDaily ? `🔥 ${dailyStreak} 天` : `${(dailyCompletionRate * 100).toFixed(0)}%`}
          </Text>
          <Text style={styles.infoLabel}>
            {isDaily ? '连续完成' : '本周每日完成率'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>×{multiplier.toFixed(1)}</Text>
          <Text style={styles.infoLabel}>
            {isDaily ? '今日奖励倍率' : '星尘系数'}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        {isDaily ? '截止次日凌晨 4:00' : '每周一凌晨 4:00 重置'}
      </Text>

      {/* 任务列表 */}
      <ScrollView contentContainerStyle={styles.list}>
        {tasks.length === 0 ? (
          <Text style={styles.empty}>还没有任务哦～</Text>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              rewardLabel={rewardLabel}
              multiplier={multiplier}
              onClaim={() => claimTaskReward(task.id, !isDaily)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.textInverse,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: theme.fontSize.headline,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  infoLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  list: {
    paddingBottom: theme.spacing.lg,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
  },
});

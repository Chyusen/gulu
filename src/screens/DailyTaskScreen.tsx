/**
 * 咕噜 Gulu — 每日任务页面
 * 从 useTaskStore 读取任务列表并领取奖励
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTaskStore } from '../stores/taskStore';
import { usePetStore } from '../stores/petStore';
import { TaskCard } from '../components/TaskCard';
import { theme } from '../constants/theme';

export function DailyTaskScreen() {
  const {
    dailyTasks,
    dailyStreak,
    checkAndReset,
    claimTaskReward,
    getDailyMultiplier,
  } = useTaskStore();
  const pet = usePetStore((s) => s.pet);
  const multiplier = getDailyMultiplier();

  useEffect(() => {
    checkAndReset((pet?.stageNumber ?? 1) as 1 | 2 | 3);
  }, [checkAndReset, pet?.stageNumber]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>每日任务</Text>
          <Text style={styles.subtitle}>截止次日凌晨 4:00</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>🔥 {dailyStreak} 天</Text>
            <Text style={styles.infoLabel}>连续完成</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>×{multiplier.toFixed(1)}</Text>
            <Text style={styles.infoLabel}>今日奖励倍率</Text>
          </View>
        </View>

        {dailyTasks.length === 0 ? (
          <Text style={styles.empty}>今天还没有任务哦～</Text>
        ) : (
          dailyTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              rewardLabel="🪙"
              multiplier={multiplier}
              onClaim={() => claimTaskReward(task.id)}
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
  },
});

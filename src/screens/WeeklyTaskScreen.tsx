/**
 * 咕噜 Gulu — 每周任务页面
 * 从 useTaskStore 读取任务列表并领取星尘奖励
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTaskStore } from '../stores/taskStore';
import { usePetStore } from '../stores/petStore';
import { TaskCard } from '../components/TaskCard';
import { theme } from '../constants/theme';

export function WeeklyTaskScreen() {
  const {
    weeklyTasks,
    dailyCompletionRate,
    checkAndReset,
    claimTaskReward,
    getWeeklyMultiplier,
  } = useTaskStore();
  const pet = usePetStore((s) => s.pet);
  const multiplier = getWeeklyMultiplier();

  useEffect(() => {
    checkAndReset((pet?.stageNumber ?? 1) as 1 | 2 | 3);
  }, [checkAndReset, pet?.stageNumber]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>每周任务</Text>
          <Text style={styles.subtitle}>每周一凌晨 4:00 重置</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{(dailyCompletionRate * 100).toFixed(0)}%</Text>
            <Text style={styles.infoLabel}>本周每日完成率</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>×{multiplier.toFixed(1)}</Text>
            <Text style={styles.infoLabel}>星尘系数</Text>
          </View>
        </View>

        {weeklyTasks.length === 0 ? (
          <Text style={styles.empty}>本周还没有任务哦～</Text>
        ) : (
          weeklyTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              rewardLabel="✨"
              multiplier={multiplier}
              onClaim={() => claimTaskReward(task.id, true)}
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

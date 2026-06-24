/**
 * 咕噜 Gulu — 任务卡片
 * 展示任务描述、进度、奖励和领取按钮
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import type { DailyTask, WeeklyTask } from '../types';

type AnyTask = DailyTask | WeeklyTask;

interface TaskCardProps {
  task: AnyTask;
  rewardLabel: string;
  multiplier?: number;
  onClaim: () => void;
}

export function TaskCard({ task, rewardLabel, multiplier = 1, onClaim }: TaskCardProps) {
  const progress = task.targetProgress > 0 ? task.currentProgress / task.targetProgress : 0;
  const displayReward =
    'reward' in task
      ? Math.floor(task.reward * multiplier)
      : Math.floor(task.baseReward * multiplier);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.description}>{task.description}</Text>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>
            {rewardLabel} ×{displayReward}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(1, progress) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {task.currentProgress} / {task.targetProgress}
      </Text>

      <TouchableOpacity
        style={[
          styles.claimBtn,
          task.isClaimed && styles.claimedBtn,
          !task.isCompleted && styles.disabledBtn,
        ]}
        onPress={onClaim}
        disabled={!task.isCompleted || task.isClaimed}
      >
        <Text style={[styles.claimBtnText, task.isClaimed && styles.claimedBtnText]}>
          {task.isClaimed ? '已领取' : task.isCompleted ? '领取奖励' : '进行中'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  description: {
    flex: 1,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    marginRight: theme.spacing.sm,
  },
  rewardBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  rewardText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  claimBtn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  claimedBtn: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  disabledBtn: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  claimBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  claimedBtnText: {
    color: theme.colors.textSecondary,
  },
});

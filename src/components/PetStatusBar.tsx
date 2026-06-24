/**
 * 咕噜 Gulu — 顶部宠物状态栏
 * 对应需求文档 3.2 顶部状态栏
 * 左上角：宠物头像 + 名称 + 体力/亲密度/能量三维迷你条
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PetAvatar } from './PetAvatar';
import { EnergyBar } from './EnergyBar';
import { theme } from '../constants/theme';
import { MBTI_PERSONALITY } from '../constants/mbti';
import { useUserStore } from '../stores/userStore';
import type { Pet, MBTIType } from '../types';

interface PetStatusBarProps {
  pet: Pet;
  onPress: () => void;
}

interface StatRowProps {
  label: string;
  value: number;
  max: number;
}

function StatRow({ label, value, max }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBar}>
        <EnergyBar energy={value} maxEnergy={max} height={3} />
      </View>
      <Text style={styles.statText}>
        {value}/{max}
      </Text>
    </View>
  );
}

export function PetStatusBar({ pet, onPress }: PetStatusBarProps) {
  const user = useUserStore((s) => s.user);
  const stageText =
    pet.currentStage === 'baby' ? '幼崽期' : pet.currentStage === 'adult' ? '伴生期' : '觉醒期';

  const personalityTag = user?.mbti
    ? MBTI_PERSONALITY[user.mbti as MBTIType]?.tag
    : null;

  const stamina = pet.stamina ?? 0;
  const maxStamina = pet.maxStamina ?? 100;
  const intimacy = pet.intimacy ?? 0;
  const maxIntimacy = pet.maxIntimacy ?? 300;
  const totalEnergy = pet.totalEnergy ?? 0;
  const maxTotalEnergy = pet.maxTotalEnergy ?? 500;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {/* 宠物头像 */}
      <View style={styles.avatarContainer}>
        <PetAvatar stage={pet.currentStage} style={pet.style} state="normal" size={40} />
      </View>

      {/* 名称 + 阶段 */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={styles.stage}>{stageText}</Text>
        {personalityTag ? (
          <Text style={styles.personalityTag} numberOfLines={1}>
            {personalityTag}
          </Text>
        ) : null}
      </View>

      {/* 三维数值条 */}
      <View style={styles.statsContainer}>
        <StatRow label="体力" value={stamina} max={maxStamina} />
        <StatRow label="亲密" value={intimacy} max={maxIntimacy} />
        <StatRow label="能量" value={totalEnergy} max={maxTotalEnergy} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: `${theme.colors.backgroundSecondary}CC`,
    borderRadius: theme.radius.xl,
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  infoContainer: {
    minWidth: 60,
  },
  name: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stage: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  personalityTag: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 2,
  },
  statsContainer: {
    width: 120,
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    width: 28,
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
  statBar: {
    flex: 1,
  },
  statText: {
    width: 34,
    fontSize: 9,
    color: theme.colors.textTertiary,
    textAlign: 'right',
  },
});

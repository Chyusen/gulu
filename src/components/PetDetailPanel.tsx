/**
 * 咕噜 Gulu — 宠物详情半屏弹窗内容
 * 对应需求文档 2.1 三大核心数值 / 2.2 进化条件
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { PetAvatar } from './PetAvatar';
import { theme } from '../constants/theme';
import { STAGE_NAMES, EVOLUTION_THRESHOLDS, STAGE_LIMITS, STAMINA_THRESHOLD } from '../constants/evolution';
import { MBTI_PERSONALITY } from '../constants/mbti';
import { useCurrencyStore } from '../stores/currencyStore';
import { usePetStore } from '../stores/petStore';
import { useUserStore } from '../stores/userStore';
import type { Pet, StyleType, MBTIType } from '../types';

interface PetDetailPanelProps {
  pet: Pet;
  onClose?: () => void;
}

const STYLE_LABELS: Record<StyleType, string> = {
  anime: '2D 动漫',
  realistic: '3D 卡通',
  pixel: '像素风',
  scifi: '赛博朋克',
};

const ALL_STYLES: StyleType[] = ['anime', 'realistic', 'pixel', 'scifi'];

const CHANGE_COST = 300;

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  lowColor?: string;
  warningText?: string;
}

function StatBar({ label, value, max, color, lowColor, warningText }: StatBarProps) {
  const percent = Math.max(0, Math.min(1, value / max));
  const fillColor = lowColor && percent <= 0.1 ? lowColor : color;
  return (
    <View style={styles.statBarSection}>
      <View style={styles.statBarHeader}>
        <Text style={styles.statBarLabel}>{label}</Text>
        <Text style={styles.statBarValue}>
          {value}/{max}
        </Text>
      </View>
      <View style={styles.statBarTrack}>
        <View style={[styles.statBarFill, { width: `${percent * 100}%`, backgroundColor: fillColor }]} />
      </View>
      {warningText ? <Text style={styles.warningText}>{warningText}</Text> : null}
    </View>
  );
}

export function PetDetailPanel({ pet, onClose }: PetDetailPanelProps) {
  const [isChangingStyle, setIsChangingStyle] = useState(false);
  const spendStarDust = useCurrencyStore((s) => s.spendStarDust);
  const setPet = usePetStore((s) => s.setPet);
  const user = useUserStore((s) => s.user);
  const stageText = STAGE_NAMES[pet.stageNumber];
  const personalityDescription = user?.mbti
    ? MBTI_PERSONALITY[user.mbti as MBTIType]?.description
    : null;

  const staminaPercent = pet.stamina / pet.maxStamina;
  const staminaWarning =
    pet.stamina === 0
      ? '咕噜沉睡了，快喂点东西唤醒它吧～'
      : staminaPercent <= STAMINA_THRESHOLD.tiredPercent
      ? '咕噜有点疲惫，让它休息一下～'
      : staminaPercent < STAMINA_THRESHOLD.exploreMinPercent
      ? '体力不足，暂时不能去探索哦～'
      : undefined;

  const handleChangeStyleStart = useCallback(() => {
    const currentStarDust = useCurrencyStore.getState().starDust;
    if (currentStarDust < CHANGE_COST) {
      Alert.alert('星尘不足', '星尘不足，可通过完成周任务或后续充值获得。');
      return;
    }
    Alert.alert(
      '确定要更换形象吗？',
      '更换形象需消耗 300 星尘，宠物将回到幼崽期，等级、经验、心情、体力、亲密度、进化进度和记忆都会重置，性格将保持不变。',
      [
        { text: '再想想', style: 'cancel' },
        {
          text: '确认更换（300 星尘）',
          onPress: () => setIsChangingStyle(true),
        },
      ]
    );
  }, []);

  const handleSelectStyle = useCallback(
    (style: StyleType) => {
      const success = spendStarDust(CHANGE_COST);
      if (!success) {
        Alert.alert('星尘不足', '星尘不足，可通过完成周任务或后续充值获得。');
        return;
      }

      // 重置宠物到幼崽期，保留性格相关字段
      const resetPet: Pet = {
        ...pet,
        style,
        currentStage: 'baby',
        stageNumber: 1,
        energyLevel: 80,
        stamina: 100,
        maxStamina: 100,
        intimacy: 0,
        maxIntimacy: 300,
        totalEnergy: 0,
        maxTotalEnergy: 500,
        currentEmotion: 'normal',
        actionClosureCount: 0,
        grayingExperienced: false,
        grayingHealed: false,
        collectibles: [],
        lastInteraction: new Date().toISOString(),
        lastInteractionAt: new Date().toISOString(),
      };

      setPet(resetPet);
      setIsChangingStyle(false);
      Alert.alert('更换成功', `你的咕噜已换上${STYLE_LABELS[style]}风格，重新开始成长吧～`);
      onClose?.();
    },
    [pet, spendStarDust, setPet, onClose]
  );

  const evolutionProgress = React.useMemo(() => {
    if (pet.stageNumber >= 3) {
      return { percent: 100, label: '咕噜已抵达灵魂体，是彼此最深的羁绊啦～' };
    }
    const currentStage = pet.stageNumber as 1 | 2;
    const threshold = EVOLUTION_THRESHOLDS[currentStage];
    const limits = STAGE_LIMITS[currentStage];
    const energyProgress = pet.totalEnergy / threshold.energy;
    const intimacyProgress = pet.intimacy / threshold.intimacy;
    const staminaProgress = pet.stamina / (limits.stamina * threshold.staminaPercent);
    const minProgress = Math.min(energyProgress, intimacyProgress, staminaProgress);
    return {
      percent: Math.min(100, Math.floor(minProgress * 100)),
      label: '进化进度（由能量、亲密度、体力共同决定）',
      requirements: {
        energy: threshold.energy,
        intimacy: threshold.intimacy,
        stamina: Math.floor(limits.stamina * threshold.staminaPercent),
      },
    };
  }, [pet]);

  if (isChangingStyle) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.changeTitle}>选择新形象风格</Text>
        <Text style={styles.changeHint}>
          当前已扣除 300 星尘，请选择你喜欢的风格。更换后宠物将回到幼崽期。
        </Text>
        <View style={styles.styleGrid}>
          {ALL_STYLES.map((style) => (
            <TouchableOpacity
              key={style}
              style={styles.styleCard}
              onPress={() => handleSelectStyle(style)}
              activeOpacity={0.8}
            >
              <PetAvatar stage="baby" style={style} state="normal" size={64} />
              <Text style={styles.styleCardLabel}>{STYLE_LABELS[style]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setIsChangingStyle(false)}
        >
          <Text style={styles.cancelButtonText}>取消更换</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 宠物头像 */}
      <View style={styles.avatarSection}>
        <PetAvatar
          stage={pet.currentStage}
          style={pet.style}
          state="normal"
          emotion={pet.currentEmotion}
          size={120}
          animated
        />
        <Text style={styles.name}>{pet.name}</Text>
        <Text style={styles.meta}>
          {stageText} · {STYLE_LABELS[pet.style] ?? pet.style}
        </Text>
      </View>

      {/* 三维数值 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>咕噜状态</Text>
        <StatBar
          label="体力"
          value={pet.stamina}
          max={pet.maxStamina}
          color={theme.colors.energyHigh}
          lowColor={theme.colors.energyLow}
          warningText={staminaWarning}
        />
        <StatBar
          label="亲密度"
          value={pet.intimacy}
          max={pet.maxIntimacy}
          color={theme.colors.emotionHappy}
        />
        <StatBar
          label="能量"
          value={pet.totalEnergy}
          max={pet.maxTotalEnergy}
          color={theme.colors.primary}
        />
      </View>

      {/* 进化进度 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{evolutionProgress.label}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${evolutionProgress.percent}%` }]} />
        </View>
        <Text style={styles.progressText}>{evolutionProgress.percent}%</Text>
        {pet.stageNumber < 3 && evolutionProgress.requirements && (
          <Text style={styles.progressHint}>
            下一阶段需要：能量 ≥ {evolutionProgress.requirements.energy} · 亲密度 ≥ {evolutionProgress.requirements.intimacy} · 体力 ≥ {evolutionProgress.requirements.stamina}
          </Text>
        )}
      </View>

      {/* 性格说明 */}
      {personalityDescription ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>性格说明</Text>
          <Text style={styles.personalityDescription}>{personalityDescription}</Text>
        </View>
      ) : null}

      {/* 数据行 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pet.actionClosureCount}</Text>
          <Text style={styles.statLabel}>行动闭环</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pet.collectibles.length}</Text>
          <Text style={styles.statLabel}>收集元素</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pet.grayingSeverity > 0 ? `${pet.grayingSeverity}/5` : '健康'}</Text>
          <Text style={styles.statLabel}>灰化状态</Text>
        </View>
      </View>

      {/* 更换形象入口 */}
      <View style={styles.changeStyleSection}>
        <Text style={styles.changeStyleHint}>
          更换形象需消耗 300 星尘，宠物将回到幼崽期并重置成长数据。
        </Text>
        <TouchableOpacity style={styles.changeStyleButton} onPress={handleChangeStyleStart} activeOpacity={0.8}>
          <Text style={styles.changeStyleButtonText}>✨ 更换形象（300 星尘）</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  name: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  meta: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  statBarSection: {
    marginBottom: theme.spacing.md,
  },
  statBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  statBarLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  statBarValue: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  statBarTrack: {
    height: 12,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  warningText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.energyLow,
    marginTop: theme.spacing.xs,
  },
  progressTrack: {
    height: 12,
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
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  progressHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.primaryLight,
  },
  statLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  personalityDescription: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  changeStyleSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changeStyleHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  changeStyleButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  changeStyleButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  changeTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  changeHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  styleCard: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  styleCardLabel: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
});

/**
 * 咕噜 Gulu — 室内陪伴活动 / 散步 / 运动 页面
 * 对应需求文档 4.9 室内陪伴活动、4.3 散步、4.4 运动
 * 活动完成后增加能量和亲密度，散步/运动消耗体力
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  AppState,
  AppStateStatus,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Background } from '../components/Background';
import { theme } from '../constants/theme';
import { usePetStore } from '../stores/petStore';
import { useTaskStore } from '../stores/taskStore';
import {
  COMPANION_ACTIVITIES,
  getCompanionActivity,
  calculateCompanionRewards,
  type CompanionActivityConfig,
} from '../constants/companionActivities';
import type { CompanionActivityType } from '../types';

type ActivitySession = {
  type: CompanionActivityType | 'walk' | 'sport';
  durationMinutes: number;
};

const WALK_SPORT_CONFIGS: Record<'walk' | 'sport', Omit<CompanionActivityConfig, 'type'>> = {
  walk: {
    name: '散步',
    emoji: '🚶',
    minDuration: 10,
    maxDuration: 60,
    defaultDuration: 20,
    energyPerMinute: 1.5,
    intimacyBase: 8,
    description: '和咕噜一起慢慢走，看看周围的风景～',
    color: theme.colors.success,
  },
  sport: {
    name: '运动',
    emoji: '🏃',
    minDuration: 10,
    maxDuration: 90,
    defaultDuration: 30,
    energyPerMinute: 1.2,
    intimacyBase: 12,
    description: '动起来吧！咕噜会为你加油～',
    color: theme.colors.error,
  },
};

export function CompanionActivityScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CompanionActivity'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mode = route.params?.mode ?? 'indoor';

  const pet = usePetStore((s) => s.pet);
  const updateStamina = usePetStore((s) => s.updateStamina);
  const updateTotalEnergy = usePetStore((s) => s.updateTotalEnergy);
  const updateIntimacy = usePetStore((s) => s.updateIntimacy);
  const updateLastInteraction = usePetStore((s) => s.updateLastInteraction);
  const updateTaskProgress = useTaskStore((s) => s.updateTaskProgress);

  const [selectedActivity, setSelectedActivity] = useState<CompanionActivityType | 'walk' | 'sport'>(
    mode === 'walk' ? 'walk' : mode === 'sport' ? 'sport' : 'meditation'
  );
  const [phase, setPhase] = useState<'select' | 'running' | 'rest' | 'done'>('select');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [duration, setDuration] = useState(0);
  const [journalText, setJournalText] = useState('');
  const [result, setResult] = useState<{ energy: number; intimacy: number; staminaCost: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const pausedAtRef = useRef<number | null>(null);

  const activities: ActivitySession[] =
    mode === 'indoor'
      ? COMPANION_ACTIVITIES.map((config) => ({ type: config.type, durationMinutes: config.defaultDuration, config }))
      : [{ type: mode, durationMinutes: WALK_SPORT_CONFIGS[mode as 'walk' | 'sport'].defaultDuration }];

  const currentConfig =
    selectedActivity === 'walk' || selectedActivity === 'sport'
      ? WALK_SPORT_CONFIGS[selectedActivity]
      : getCompanionActivity(selectedActivity as CompanionActivityType);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 监听 App 后台，暂停计时
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        pausedAtRef.current = Date.now();
        clearTimer();
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (pausedAtRef.current && phase === 'running') {
          const elapsed = Math.floor((Date.now() - pausedAtRef.current) / 1000);
          setSecondsLeft((prev) => Math.max(0, prev - elapsed));
        }
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [clearTimer, phase]);

  const handleStart = useCallback(() => {
    if (!pet) return;
    const minutes = duration || currentConfig.defaultDuration;

    if (selectedActivity === 'walk' || selectedActivity === 'sport') {
      const staminaCost = selectedActivity === 'walk' ? Math.floor(minutes * 0.8) : Math.floor(minutes * 1.2);
      const maxCost = selectedActivity === 'walk' ? 20 : 40;
      const finalCost = Math.min(staminaCost, maxCost);
      if (pet.stamina < finalCost) {
        Alert.alert('体力不足', '咕噜有点累了，先喂点东西恢复体力吧～');
        return;
      }
    }

    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    setPhase('running');
  }, [currentConfig.defaultDuration, duration, pet, selectedActivity]);

  const handleComplete = useCallback(() => {
    if (!pet) return;
    const minutes = duration || currentConfig.defaultDuration;

    let staminaCost = 0;
    if (selectedActivity === 'walk') {
      staminaCost = Math.min(Math.floor(minutes * 0.8), 20);
    } else if (selectedActivity === 'sport') {
      staminaCost = Math.min(Math.floor(minutes * 1.2), 40);
    }

    let energy = 0;
    let intimacy = 0;

    if (selectedActivity === 'walk' || selectedActivity === 'sport') {
      const cfg = WALK_SPORT_CONFIGS[selectedActivity];
      energy = Math.floor(cfg.energyPerMinute * minutes);
      intimacy = cfg.intimacyBase;
    } else {
      const rewards = calculateCompanionRewards(selectedActivity as CompanionActivityType, minutes);
      energy = rewards.energy;
      intimacy = rewards.intimacy;
    }

    updateStamina(-staminaCost);
    updateTotalEnergy(energy);
    updateIntimacy(intimacy);
    updateLastInteraction();

    // 更新任务进度
    if (selectedActivity === 'walk' || selectedActivity === 'sport') {
      const exploreTask = useTaskStore.getState().dailyTasks.find((t) => t.type === 'explore');
      if (exploreTask) updateTaskProgress(exploreTask.id, 1);
    }
    const companionTask = useTaskStore.getState().dailyTasks.find((t) => t.type === 'companion');
    if (companionTask) updateTaskProgress(companionTask.id, 1);

    setResult({ energy, intimacy, staminaCost });
    setPhase('done');
  }, [currentConfig.defaultDuration, duration, pet, selectedActivity, updateIntimacy, updateLastInteraction, updateStamina, updateTaskProgress, updateTotalEnergy]);

  useEffect(() => {
    if (phase === 'running' && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return clearTimer;
    }
    return undefined;
  }, [phase, secondsLeft, clearTimer, handleComplete]);

  const handleStop = useCallback(() => {
    clearTimer();
    setPhase('select');
    setSecondsLeft(0);
  }, [clearTimer]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderSelectPhase = () => (
    <ScrollView contentContainerStyle={styles.selectContent}>
      <Text style={styles.selectTitle}>
        {mode === 'indoor' ? '选择一个陪伴活动' : mode === 'walk' ? '一起去散步吧' : '一起运动吧'}
      </Text>
      <Text style={styles.selectSubtitle}>{currentConfig.description}</Text>

      <View style={styles.activityList}>
        {activities.map((activity) => {
          const config =
            activity.type === 'walk' || activity.type === 'sport'
              ? WALK_SPORT_CONFIGS[activity.type]
              : getCompanionActivity(activity.type as CompanionActivityType);
          const isSelected = selectedActivity === activity.type;
          return (
            <TouchableOpacity
              key={activity.type}
              style={[styles.activityCard, isSelected && styles.activityCardSelected]}
              onPress={() => {
                setSelectedActivity(activity.type);
                setDuration(config.defaultDuration);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.activityCardEmoji}>{config.emoji}</Text>
              <View style={styles.activityCardInfo}>
                <Text style={styles.activityCardName}>{config.name}</Text>
                <Text style={styles.activityCardDesc}>{config.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedActivity === 'journal' && (
        <TextInput
          style={styles.journalInput}
          value={journalText}
          onChangeText={setJournalText}
          placeholder="把今天的心情写下来，咕噜会认真倾听～"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={500}
        />
      )}

      <View style={styles.durationBox}>
        <Text style={styles.durationLabel}>时长：{duration || currentConfig.defaultDuration} 分钟</Text>
        <View style={styles.durationButtons}>
          {[5, 10, 15, 20, 25, 30].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.durationBtn, (duration || currentConfig.defaultDuration) === m && styles.durationBtnSelected]}
              onPress={() => setDuration(m)}
            >
              <Text style={styles.durationBtnText}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
        <Text style={styles.startBtnText}>开始</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderRunningPhase = () => (
    <View style={styles.centerContent}>
      <Text style={styles.runningEmoji}>{currentConfig.emoji}</Text>
      <Text style={styles.runningName}>{currentConfig.name} 进行中</Text>
      <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>
      <Text style={styles.runningHint}>
        {selectedActivity === 'pomodoro'
          ? '咕噜安静地陪着你，专注当下～'
          : selectedActivity === 'meditation'
          ? '慢慢来，和咕噜一起深呼吸～'
          : '咕噜一直在这里陪着你哦～'}
      </Text>
      <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
        <Text style={styles.stopBtnText}>提前结束</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDonePhase = () => (
    <View style={styles.centerContent}>
      <Text style={styles.doneEmoji}>✨</Text>
      <Text style={styles.doneTitle}>完成啦！</Text>
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>能量 +{result.energy}</Text>
          <Text style={styles.resultText}>亲密度 +{result.intimacy}</Text>
          {result.staminaCost > 0 && <Text style={styles.resultText}>体力消耗 -{result.staminaCost}</Text>}
        </View>
      )}
      <Text style={styles.doneHint}>咕噜觉得和你在一起的时间特别珍贵～</Text>
      <TouchableOpacity style={styles.startBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.startBtnText}>返回</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Background name="home">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.headerEmoji}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentConfig.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {phase === 'select' && renderSelectPhase()}
        {phase === 'running' && renderRunningPhase()}
        {phase === 'done' && renderDonePhase()}
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerEmoji: {
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
  headerTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  selectContent: {
    padding: theme.spacing.lg,
  },
  selectTitle: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  selectSubtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  activityList: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}22`,
  },
  activityCardEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  activityCardInfo: {
    flex: 1,
  },
  activityCardName: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  activityCardDesc: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  journalInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.xl,
  },
  durationBox: {
    marginBottom: theme.spacing.xl,
  },
  durationLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  durationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBtnSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationBtnText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  startBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  runningEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  runningName: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    color: theme.colors.primary,
    marginVertical: theme.spacing.xl,
    fontVariant: ['tabular-nums'],
  },
  runningHint: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  stopBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stopBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
  },
  doneEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  doneTitle: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  resultBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  resultText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    marginVertical: 2,
  },
  doneHint: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});

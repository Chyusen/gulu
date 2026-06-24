/**
 * 咕噜 Gulu — 宠物自主探索
 * 对应需求文档 4.6 宠物自主探索
 * 用户设定探索时长，显示预计体力消耗，确认后派遣咕噜外出
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Background } from '../components/Background';
import { PetAvatar } from '../components/PetAvatar';
import { theme } from '../constants/theme';
import { useExploreStore } from '../stores/exploreStore';
import { usePetStore } from '../stores/petStore';
import { AUTO_EXPLORE_STAMINA_PER_HOUR, AUTO_EXPLORE_MAX_HOURS } from '../constants/evolution';

const DURATION_OPTIONS = [1, 2, 4, 8];

export function AutoExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pet = usePetStore((s) => s.pet);
  const startAutoExplore = useExploreStore((s) => s.startAutoExplore);
  const completeAutoExplore = useExploreStore((s) => s.completeAutoExplore);
  const autoExplore = useExploreStore((s) => s.autoExplore);

  const [selectedDuration, setSelectedDuration] = useState(2);
  const [now, setNow] = useState(Date.now());

  // 如果正在探索中，定时刷新倒计时
  useEffect(() => {
    if (!autoExplore.isExploring) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [autoExplore.isExploring]);

  const maxHours = pet ? AUTO_EXPLORE_MAX_HOURS[pet.stageNumber] : 4;
  const availableDurations = DURATION_OPTIONS.filter((h) => h <= maxHours);

  const staminaPerHour = pet ? AUTO_EXPLORE_STAMINA_PER_HOUR[pet.stageNumber] : 5;
  const estimatedCost = selectedDuration * staminaPerHour;

  const handleStart = useCallback(() => {
    if (!pet) return;
    const ok = startAutoExplore(selectedDuration, pet.stageNumber);
    if (!ok) {
      Alert.alert('体力不足', `这次外出预计需要 ${estimatedCost} 点体力，先让咕噜吃点东西吧～`);
    }
  }, [estimatedCost, pet, selectedDuration, startAutoExplore]);

  const handleComplete = useCallback(() => {
    const whisper = completeAutoExplore();
    if (whisper) {
      Alert.alert(
        '咕噜回来啦～',
        '它带回了小故事和礼物，快去看看吧～',
        [{ text: '查看悄悄话', onPress: () => navigation.navigate('GuluWhisper') }]
      );
    }
  }, [completeAutoExplore, navigation]);

  const handleForceComplete = useCallback(() => {
    Alert.alert(
      '提前召回咕噜？',
      'Demo 模式下可以提前结束探索～',
      [
        { text: '取消', style: 'cancel' },
        { text: '召回', onPress: handleComplete },
      ]
    );
  }, [handleComplete]);

  if (!pet) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>还没有咕噜哦</Text>
      </View>
    );
  }

  const remainingSeconds =
    autoExplore.isExploring && autoExplore.startedAt && autoExplore.duration
      ? Math.max(
          0,
          autoExplore.duration * 3600 - Math.floor((now - new Date(autoExplore.startedAt).getTime()) / 1000)
        )
      : 0;

  return (
    <Background name="home">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.headerEmoji}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>派遣咕噜探索</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.petBox}>
            <PetAvatar stage={pet.currentStage} style={pet.style} state="normal" size={140} animated />
            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={styles.petState}>
              {autoExplore.isExploring ? '外出中 🐾' : '待命中～'}
            </Text>
          </View>

          {!autoExplore.isExploring ? (
            <>
              <Text style={styles.sectionTitle}>选择外出时长</Text>
              <View style={styles.durationRow}>
                {availableDurations.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.durationBtn, selectedDuration === h && styles.durationBtnSelected]}
                    onPress={() => setSelectedDuration(h)}
                  >
                    <Text style={[styles.durationBtnText, selectedDuration === h && styles.durationBtnTextSelected]}>
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>预计消耗</Text>
                <Text style={styles.infoRow}>体力：-{estimatedCost}</Text>
                <Text style={styles.infoRow}>能量：+{Math.floor(15 * selectedDuration * pet.stageNumber)}</Text>
                <Text style={styles.infoRow}>咕噜币：+{Math.floor(10 * selectedDuration * pet.stageNumber)}</Text>
                <Text style={styles.infoHint}>不同进化形态消耗不同，当前为 {staminaPerHour}/h</Text>
              </View>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={handleStart}
                disabled={pet.stamina < estimatedCost}
              >
                <Text style={styles.startBtnText}>
                  {pet.stamina < estimatedCost ? '体力不足，先喂点吃的吧' : '让咕噜出发吧'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>咕噜正在外面探险</Text>
              <Text style={styles.progressSubtitle}>它可能在交朋友，也可能发现了一片安静的草地～</Text>
              <Text style={styles.timer}>
                剩余 {Math.floor(remainingSeconds / 3600)}h {Math.floor((remainingSeconds % 3600) / 60)}m {remainingSeconds % 60}s
              </Text>
              <TouchableOpacity style={styles.completeBtn} onPress={handleForceComplete}>
                <Text style={styles.completeBtnText}>提前召回咕噜</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
  },
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
  content: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  petBox: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  petName: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  petState: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  durationBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  durationBtnTextSelected: {
    color: theme.colors.textInverse,
  },
  infoCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  infoTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
  startBtn: {
    width: '100%',
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
  progressCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  progressSubtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  timer: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
    fontVariant: ['tabular-nums'],
  },
  completeBtn: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  completeBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
});

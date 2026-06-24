/**
 * 咕噜 Gulu — Citywalk 界面
 * 对应需求文档 4.5 Citywalk
 * 带着咕噜在城市中漫步，打卡附近 POI，消耗体力并获得能量/亲密度
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { theme } from '../constants/theme';
import { usePetStore } from '../stores/petStore';
import { useTaskStore } from '../stores/taskStore';
import { AssetManager } from '../utils/AssetManager';
import { STAMINA_THRESHOLD } from '../constants/evolution';
import type { POI } from '../types';

const NEARBY_POIS: POI[] = [
  { id: '1', name: '街角咖啡馆', type: 'cafe', lat: 0, lng: 0, distance: 120 },
  { id: '2', name: '中央公园', type: 'park', lat: 0, lng: 0, distance: 280 },
  { id: '3', name: '城市图书馆', type: 'bookstore', lat: 0, lng: 0, distance: 450 },
  { id: '4', name: '老街美食', type: 'restaurant', lat: 0, lng: 0, distance: 600 },
];

const DIALOGUES: Record<string, string> = {
  cafe: '好香啊～这里有种让人放松的氛围，要不要坐下来喝一杯？',
  park: '哇，好大的草坪！这里的空气好清新，我们多待一会儿吧～',
  bookstore: '好多书！你最喜欢哪一本？我想听你讲讲～',
  restaurant: '好香！今天想吃点什么呢？记得好好吃饭哦～',
};

export function CitywalkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pet = usePetStore((s) => s.pet);
  const updateStamina = usePetStore((s) => s.updateStamina);
  const updateTotalEnergy = usePetStore((s) => s.updateTotalEnergy);
  const updateIntimacy = usePetStore((s) => s.updateIntimacy);
  const updateLastInteraction = usePetStore((s) => s.updateLastInteraction);
  const updateTaskProgress = useTaskStore((s) => s.updateTaskProgress);

  const [isWalking, setIsWalking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [visitedPOIs, setVisitedPOIs] = useState<POI[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 播放 Citywalk 背景音乐
  useEffect(() => {
    let music: Awaited<ReturnType<typeof AssetManager.loadMusic>> = null;
    if (isWalking) {
      AssetManager.loadMusic('citywalk_theme', true).then((s) => {
        music = s;
        s?.playAsync();
      });
    }
    return () => {
      music?.stopAsync();
      music?.unloadAsync();
    };
  }, [isWalking]);

  // 计时器
  useEffect(() => {
    if (!isWalking || !startTime) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isWalking, startTime]);

  const canExplore = pet ? pet.stamina >= (pet.maxStamina * STAMINA_THRESHOLD.exploreMinPercent) : false;

  const handleStart = useCallback(() => {
    if (!pet) return;
    if (!canExplore) {
      Alert.alert('体力不足', '咕噜有点累了，先喂点东西恢复体力吧～');
      return;
    }
    setIsWalking(true);
    setStartTime(Date.now());
    setVisitedPOIs([]);
    setElapsedSeconds(0);
    Alert.alert('Citywalk 开始', `${pet.name} 跟你一起出发啦！`);
  }, [canExplore, pet]);

  const handleEnd = useCallback(() => {
    if (!pet) return;
    setIsWalking(false);
    setStartTime(null);

    const visitedCount = visitedPOIs.length;
    // 消耗体力：15~30，按打卡 POI 数量递增
    const staminaCost = Math.min(30, 15 + visitedCount * 4);
    // 能量：20~40，按 POI 数量递增
    const energy = Math.min(40, 20 + visitedCount * 5);
    // 亲密度：5~10
    const intimacy = Math.min(10, 5 + visitedCount);

    updateStamina(-staminaCost);
    updateTotalEnergy(energy);
    updateIntimacy(intimacy);
    updateLastInteraction();

    // 更新每日任务进度
    const exploreTask = useTaskStore.getState().dailyTasks.find((t) => t.type === 'explore');
    if (exploreTask) updateTaskProgress(exploreTask.id, 1);

    const minutes = Math.floor(elapsedSeconds / 60);
    Alert.alert(
      '漫步报告',
      `时长：${minutes} 分钟\n打卡 POI：${visitedCount} 个\n体力 -${staminaCost} · 能量 +${energy} · 亲密 +${intimacy}\n\n${pet.name}：今天和你一起散步好开心～`
    );
    setElapsedSeconds(0);
  }, [elapsedSeconds, pet, updateIntimacy, updateLastInteraction, updateStamina, updateTaskProgress, updateTotalEnergy, visitedPOIs.length]);

  const handleCheckIn = useCallback((poi: POI) => {
    if (!isWalking || !pet) return;
    if (visitedPOIs.find((p) => p.id === poi.id)) {
      Alert.alert('已打卡', `已经到过 ${poi.name} 啦`);
      return;
    }
    setVisitedPOIs([...visitedPOIs, poi]);
    Alert.alert(poi.name, `${pet.name}：${DIALOGUES[poi.type] ?? '这里好有趣！'}`);
  }, [isWalking, pet, visitedPOIs]);

  if (!pet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>还没有宠物</Text>
      </View>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.headerEmoji}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Citywalk</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>带着 {pet.name} 一起探索城市</Text>

        {/* 状态卡片 */}
        {isWalking && (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>漫步中</Text>
            <Text style={styles.statusValue}>{formatTime(elapsedSeconds)}</Text>
            <Text style={styles.statusSub}>已打卡 {visitedPOIs.length} 个地点</Text>
          </View>
        )}

        {/* 开始/结束按钮 */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            isWalking ? styles.endButton : canExplore ? styles.startButton : styles.disabledButton,
          ]}
          onPress={isWalking ? handleEnd : handleStart}
          disabled={!isWalking && !canExplore}
        >
          <Text style={styles.mainButtonText}>
            {isWalking ? '结束漫步' : canExplore ? '开始 Citywalk' : '体力不足'}
          </Text>
        </TouchableOpacity>

        {!canExplore && !isWalking && (
          <Text style={styles.warningText}>咕噜的体力还不到 20%，先休息一下吧～</Text>
        )}

        {/* 附近 POI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>附近地点</Text>
          {NEARBY_POIS.map((poi) => {
            const visited = visitedPOIs.find((p) => p.id === poi.id);
            return (
              <TouchableOpacity
                key={poi.id}
                style={[
                  styles.poiCard,
                  visited && styles.poiCardVisited,
                  !isWalking && styles.poiCardDisabled,
                ]}
                disabled={!isWalking}
                onPress={() => handleCheckIn(poi)}
              >
                <View style={styles.poiInfo}>
                  <Text style={styles.poiName}>{poi.name}</Text>
                  <Text style={styles.poiType}>
                    {poi.type === 'cafe' ? '咖啡馆' :
                     poi.type === 'park' ? '公园' :
                     poi.type === 'bookstore' ? '书店' :
                     poi.type === 'restaurant' ? '餐厅' : poi.type}
                  </Text>
                </View>
                <View style={styles.poiRight}>
                  <Text style={styles.poiDistance}>{poi.distance}m</Text>
                  {visited && <Text style={styles.visitedTag}>已打卡</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 漫步提示 */}
        {!isWalking && (
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              开始 Citywalk 后，靠近地点即可打卡，{pet.name} 会根据地点和你聊天～打卡越多，获得的能量和亲密度越多哦～
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
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
    paddingTop: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statusLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusSub: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  mainButton: {
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
  },
  endButton: {
    backgroundColor: theme.colors.error,
  },
  disabledButton: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  mainButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
  },
  warningText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  poiCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  poiCardVisited: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  poiCardDisabled: {
    opacity: 0.6,
  },
  poiInfo: {
    flex: 1,
  },
  poiName: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  poiType: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  poiRight: {
    alignItems: 'flex-end',
  },
  poiDistance: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
  visitedTag: {
    fontSize: 10,
    color: theme.colors.success,
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  tipText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});

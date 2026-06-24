/**
 * 咕噜 Gulu — 宠物社交界面
 * 对应需求文档 七、宠物社交系统
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
import { theme } from '../constants/theme';
import { usePetStore } from '../stores/petStore';
import { PetAvatar } from '../components/PetAvatar';
import { socialService } from '../services/socialService';
import type { NearbyPet, SocialInteraction } from '../types';

const INTERACTION_TYPES = [
  { type: 'wave', label: '打招呼', emoji: '👋' },
  { type: 'gift', label: '送礼物', emoji: '🎁' },
  { type: 'hug', label: '拥抱', emoji: '🤗' },
  { type: 'play', label: '一起玩', emoji: '🎮' },
];

export function SocialScreen() {
  const pet = usePetStore((s) => s.pet);
  const [nearbyPets, setNearbyPets] = useState<NearbyPet[]>([]);
  const [selectedPet, setSelectedPet] = useState<NearbyPet | null>(null);
  const [recentInteractions, setRecentInteractions] = useState<SocialInteraction[]>([]);

  useEffect(() => {
    loadNearbyPets();
  }, []);

  const loadNearbyPets = async () => {
    try {
      const result = await socialService.discoverNearby(0, 0, 500);
      setNearbyPets(result.nearby_pets);
    } catch (e) {
      // 降级：使用模拟数据
      setNearbyPets([
        { petId: 'p1', name: '小星', style: 'anime', stage: 'baby', distance: 120, ownerNickname: '', ownerPrivacyLevel: 1 },
        { petId: 'p2', name: '月儿', style: 'scifi', stage: 'adult', distance: 280, ownerNickname: '', ownerPrivacyLevel: 1 },
        { petId: 'p3', name: '云朵', style: 'pixel', stage: 'baby', distance: 450, ownerNickname: '', ownerPrivacyLevel: 1 },
      ]);
    }
  };

  const handleInteract = async (type: string) => {
    if (!pet || !selectedPet) return;

    // 防骚扰：检查今日互动次数
    const todayCount = recentInteractions.filter(
      (i) =>
        i.targetPetId === selectedPet.petId &&
        new Date(i.createdAt).toDateString() === new Date().toDateString()
    ).length;

    if (todayCount >= 3) {
      Alert.alert('提示', '今天已经和这只咕噜互动 3 次啦，明天再来吧～');
      return;
    }

    try {
      const result = await socialService.initiateInteraction(
        pet.id,
        selectedPet.petId,
        type
      );
      Alert.alert('互动成功', result.pet_response);

      const interaction: SocialInteraction = {
        id: result.interaction_id,
        fromPetId: pet.id,
        targetPetId: selectedPet.petId,
        interactionType: type,
        createdAt: new Date().toISOString(),
      };
      setRecentInteractions([...recentInteractions, interaction]);
      setSelectedPet(null);
    } catch (e) {
      Alert.alert('互动失败', '请稍后再试');
    }
  };

  if (!pet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>还没有宠物</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>宠物社交</Text>
        <Text style={styles.subtitle}>发现附近的咕噜伙伴</Text>

        {/* 附近宠物列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>附近发现 ({nearbyPets.length})</Text>
          {nearbyPets.map((other) => (
            <TouchableOpacity
              key={other.petId}
              style={[
                styles.petCard,
                selectedPet?.petId === other.petId && styles.petCardSelected,
              ]}
              onPress={() => setSelectedPet(other)}
            >
              <PetAvatar stage={other.stage} style={other.style} state="normal" size={60} />
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{other.name}</Text>
                <Text style={styles.petMeta}>距离 {other.distance}m</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 互动选项 */}
        {selectedPet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              和 {selectedPet.name} 互动
            </Text>
            <View style={styles.interactionGrid}>
              {INTERACTION_TYPES.map((it) => (
                <TouchableOpacity
                  key={it.type}
                  style={styles.interactionCard}
                  onPress={() => handleInteract(it.type)}
                >
                  <Text style={styles.interactionEmoji}>{it.emoji}</Text>
                  <Text style={styles.interactionLabel}>{it.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              每天对同一只咕噜最多互动 3 次，避免打扰～
            </Text>
          </View>
        )}

        {/* 最近互动 */}
        {recentInteractions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近互动</Text>
            {recentInteractions.slice(-5).reverse().map((i) => (
              <View key={i.id} style={styles.interactionLog}>
                <Text style={styles.interactionLogText}>
                  {INTERACTION_TYPES.find((t) => t.type === i.interactionType)?.label} → {nearbyPets.find((p) => p.petId === i.targetPetId)?.name ?? '未知'}
                </Text>
                <Text style={styles.interactionLogTime}>
                  {new Date(i.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
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
  title: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
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
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  petCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  petInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  petName: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  petMeta: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: theme.colors.textTertiary,
  },
  interactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  interactionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  interactionEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  interactionLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  hint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  interactionLog: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  interactionLogText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textPrimary,
  },
  interactionLogTime: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
});

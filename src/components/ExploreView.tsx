/**
 * 咕噜 Gulu — 探索页全屏视图
 * 对应需求文档 第五章
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useUserStore } from '../stores/userStore';
import { useImmersiveChatStore } from '../stores/immersiveChatStore';
import { exploreService } from '../services/exploreService';
import { HalfScreenModal } from './HalfScreenModal';
import { Background } from './Background';
import { theme } from '../constants/theme';
import type { MockNearbyPet } from '../mocks/nearbyPets';
import type { CitywalkGuide } from '../mocks/citywalkGuides';

export function ExploreView() {
  const user = useUserStore((s) => s.user);
  const addBubble = useImmersiveChatStore((s) => s.addBubble);

  const [pets, setPets] = useState<MockNearbyPet[]>([]);
  const [guides, setGuides] = useState<CitywalkGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<MockNearbyPet | null>(null);
  const [showGuides, setShowGuides] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [nearby, walk] = await Promise.all([
          exploreService.getNearbyPets(31.23, 121.47),
          exploreService.getCitywalkGuides(user?.mbti ?? null, user?.zodiac ?? null, 31.23, 121.47),
        ]);
        if (mounted) {
          setPets(nearby.pets);
          setGuides(walk.guides);
        }
      } catch {
        // mock 数据不会失败，但保留错误处理
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user?.mbti, user?.zodiac]);

  const handleGuluExplore = useCallback(() => {
    if (pets.length === 0) return;
    const target = pets[Math.floor(Math.random() * pets.length)];
    addBubble({
      id: `explore-${Date.now()}`,
      content: `我感应到附近有一位叫「${target.name}」的小伙伴，${target.intro}`,
      role: 'assistant',
      createdAt: new Date().toISOString(),
    });
  }, [addBubble, pets]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Background name="home">
      {/* 地图占位 */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.mapTitle}>咕噜探索地图</Text>
        <Text style={styles.mapSubtitle}>附近共有 {pets.length} 位小伙伴</Text>

        {/* 用户位置光点 */}
        <View style={styles.userPulse}>
          <View style={styles.userDot} />
        </View>

        {/* 附近宠物标记 */}
        {pets.slice(0, 6).map((p, index) => {
          const top = 20 + (index % 3) * 25;
          const left = 15 + (index % 2) * 35 + (index * 7) % 20;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.marker, { top: `${top}%`, left: `${left}%` }]}
              onPress={() => setSelectedPet(p)}
              activeOpacity={0.8}
            >
              <Text style={styles.markerEmoji}>🐾</Text>
              <Text style={styles.markerDistance}>{p.distance}m</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 咕噜自主探索 */}
      <TouchableOpacity style={styles.guluExploreBtn} onPress={handleGuluExplore}>
        <Text style={styles.guluExploreText}>🔮 咕噜自主探索</Text>
      </TouchableOpacity>

      {/* Citywalk 按钮 */}
      <TouchableOpacity style={styles.citywalkBtn} onPress={() => setShowGuides(true)}>
        <Text style={styles.citywalkText}>🚶 Citywalk 攻略</Text>
      </TouchableOpacity>

      {/* 选中宠物简介 */}
      <HalfScreenModal
        visible={selectedPet !== null}
        onClose={() => setSelectedPet(null)}
        title="附近的小伙伴"
        heightRatio={0.35}
      >
        {selectedPet && (
          <View style={styles.petIntro}>
            <Text style={styles.petName}>{selectedPet.name}</Text>
            <Text style={styles.petMeta}>
              主人：{selectedPet.ownerNickname} · 距离 {selectedPet.distance}m
            </Text>
            <Text style={styles.petIntroText}>{selectedPet.intro}</Text>
          </View>
        )}
      </HalfScreenModal>

      {/* Citywalk 攻略列表 */}
      <HalfScreenModal
        visible={showGuides}
        onClose={() => setShowGuides(false)}
        title="咕噜为你找到的 Citywalk 路线"
        heightRatio={0.55}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {guides.map((guide) => (
            <View key={guide.id} style={styles.guideCard}>
              <Text style={styles.guideTitle}>{guide.title}</Text>
              <View style={styles.tagRow}>
                {guide.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.guideIntro}>{guide.intro}</Text>
              <Text style={styles.guideMeta}>
                {guide.distance} · {guide.duration}
              </Text>
            </View>
          ))}
        </ScrollView>
      </HalfScreenModal>
    </Background>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  mapTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  mapSubtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  userPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerEmoji: {
    fontSize: 28,
  },
  markerDistance: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    backgroundColor: `${theme.colors.background}CC`,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 4,
    marginTop: -2,
  },
  guluExploreBtn: {
    position: 'absolute',
    top: 80,
    right: theme.spacing.md,
    backgroundColor: `${theme.colors.backgroundSecondary}E6`,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  guluExploreText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  citywalkBtn: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  citywalkText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  petIntro: {
    gap: theme.spacing.sm,
  },
  petName: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  petMeta: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  petIntroText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: theme.spacing.sm,
  },
  guideCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  guideTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  tag: {
    backgroundColor: `${theme.colors.primary}33`,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: theme.colors.primaryLight,
  },
  guideIntro: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  guideMeta: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
});

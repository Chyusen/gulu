/**
 * 咕噜 Gulu — 画像结果展示
 * 对应需求文档 2.4 画像结果
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { theme } from '../constants/theme';
import { MBTI_ANALYSIS, MBTI_STYLE_RECOMMENDATIONS, MBTI_PET_TRAITS } from '../constants/mbti';
import { useUserStore } from '../stores/userStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ProfileResult'>;

export function ProfileResultScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useUserStore((s) => s.user);

  if (!user?.mbti || !user?.zodiac) {
    return (
      <View style={styles.container}>
        <Text>画像数据缺失</Text>
      </View>
    );
  }

  const analysis = MBTI_ANALYSIS[user.mbti];
  const styles_recommended = MBTI_STYLE_RECOMMENDATIONS[user.mbti];
  const petTraits = MBTI_PET_TRAITS[user.mbti];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>你的灵魂画像</Text>

        {/* MBTI 类型 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MBTI 类型</Text>
          <Text style={styles.mbtiType}>{user.mbti}</Text>
          <Text style={styles.analysisText}>{analysis.analysis}</Text>
        </View>

        {/* 星座 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>星座</Text>
          <Text style={styles.zodiacText}>{user.zodiac}</Text>
        </View>

        {/* 性格优势与成长 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>性格优势</Text>
          {analysis.strengths.map((s, i) => (
            <Text key={i} style={styles.listItem}>• {s}</Text>
          ))}
          <View style={{ height: theme.spacing.md }} />
          <Text style={styles.cardLabel}>成长方向</Text>
          {analysis.growthAreas.map((s, i) => (
            <Text key={i} style={styles.listItem}>• {s}</Text>
          ))}
        </View>

        {/* 宠物性格匹配 */}
        <View style={[styles.card, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={styles.cardLabel}>宠物性格匹配</Text>
          <Text style={styles.petType}>{petTraits.personalityType}</Text>
          <Text style={styles.petDesc}>{petTraits.description}</Text>
        </View>

        {/* 视觉风格推荐 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>推荐视觉风格</Text>
          <View style={styles.styleRow}>
            {styles_recommended.map((s, i) => (
              <View key={i} style={styles.styleTag}>
                <Text style={styles.styleTagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: theme.spacing.xl }} />
        <Button
          title="生成我的咕噜"
          onPress={() => navigation.navigate('PetCreate')}
          size="lg"
        />
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
    paddingVertical: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  mbtiType: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  analysisText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  zodiacText: {
    fontSize: theme.fontSize.headline,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  listItem: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  petType: {
    fontSize: theme.fontSize.headline,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  petDesc: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  styleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  styleTag: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  styleTagText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

/**
 * 咕噜 Gulu — 宠物创建界面
 * 对应需求文档 3.1 宠物创建
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { PetAvatar } from '../components/PetAvatar';
import { theme } from '../constants/theme';
import { MBTI_STYLE_RECOMMENDATIONS } from '../constants/mbti';
import { useUserStore } from '../stores/userStore';
import { usePetStore } from '../stores/petStore';
import type { StyleType, Pet } from '../types';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PetCreate'>;

// Demo 阶段只保留 4 种风格
const ALL_STYLES: StyleType[] = ['anime', 'realistic', 'pixel', 'scifi'];

const STYLE_LABELS: Record<StyleType, string> = {
  anime: '2D 动漫',
  realistic: '3D 卡通',
  pixel: '像素风',
  scifi: '赛博朋克',
};

export function PetCreateScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useUserStore((s) => s.user);
  const setPet = usePetStore((s) => s.setPet);

  const recommendedStyles: StyleType[] = user?.mbti ? MBTI_STYLE_RECOMMENDATIONS[user.mbti] : ['anime'];
  const [name, setName] = useState('咕噜');
  const [selectedStyle, setSelectedStyle] = useState<StyleType>(recommendedStyles[0]);
  const [customDesc, setCustomDesc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // 模拟 AI 生成（实际应调用 petService.generatePet）
      await new Promise((r) => setTimeout(r, 2000));

      const newPet: Pet = {
        id: `pet_${Date.now()}`,
        userId: user?.id ?? '',
        name: name || '咕噜',
        personalityType: 'dreamer',
        currentStage: 'baby',
        stageNumber: 1,
        energyLevel: 80,
        maxEnergy: 100,
        stamina: 100,
        maxStamina: 100,
        intimacy: 0,
        maxIntimacy: 300,
        totalEnergy: 0,
        maxTotalEnergy: 500,
        preferredFoods: ['star_fruit', 'dream_cake', 'star_soup'],
        lastInteractionAt: new Date().toISOString(),
        isGraying: false,
        grayingSeverity: 0,
        isDormant: false,
        style: selectedStyle,
        customDescription: customDesc,
        voiceType: 'cute_child',
        voiceSpeed: 1.0,
        currentEmotion: 'normal',
        actionClosureCount: 0,
        grayingExperienced: false,
        grayingHealed: false,
        collectibles: [],
        createdAt: new Date().toISOString(),
      };

      setPet(newPet);
      navigation.navigate('Main');
    } catch (e) {
      console.warn('Generate pet failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>创造你的咕噜</Text>

        {/* 预览 */}
        <View style={styles.previewContainer}>
          {isGenerating ? (
            <View style={styles.generatingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.generatingText}>咕噜正在诞生中...</Text>
            </View>
          ) : (
            <PetAvatar stage="baby" style={selectedStyle} state="normal" size={200} />
          )}
        </View>

        {/* 名称输入 */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>宠物名称</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="默认：咕噜"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={20}
          />
        </View>

        {/* 风格选择 */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>视觉风格</Text>
          <View style={styles.styleGrid}>
            {ALL_STYLES.map((style) => {
              const isRecommended = recommendedStyles.includes(style);
              const isSelected = selectedStyle === style;
              return (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.styleCard,
                    isSelected && styles.styleCardSelected,
                  ]}
                  onPress={() => setSelectedStyle(style)}
                >
                  <Text
                    style={[
                      styles.styleCardText,
                      isSelected && styles.styleCardTextSelected,
                    ]}
                  >
                    {STYLE_LABELS[style]}
                  </Text>
                  {isRecommended && (
                    <Text style={styles.recommendTag}>推荐</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 自定义描述 */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>额外描述（可选）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={customDesc}
            onChangeText={setCustomDesc}
            placeholder="描述你心目中的咕噜..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: theme.spacing.xl }} />
        <Button
          title={isGenerating ? '生成中...' : '生成咕噜'}
          onPress={handleGenerate}
          loading={isGenerating}
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
  previewContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  generatingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  textArea: {
    minHeight: 80,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  styleCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  styleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  styleCardText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  styleCardTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  recommendTag: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 9,
    color: theme.colors.textInverse,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

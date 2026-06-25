/**
 * 咕噜 Gulu — 引导流程 Step 6: 基因注入
 * 对应需求文档 3.8 Step 6：基因注入
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { PetAvatar } from '../../components/PetAvatar';
import { theme } from '../../constants/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { MBTI_STYLE_RECOMMENDATIONS } from '../../constants/mbti';
import { useUserStore } from '../../stores/userStore';
import type { StyleType, MBTIType } from '../../types';

// Demo 阶段只保留 4 种风格
const ALL_STYLES: StyleType[] = ['anime', 'realistic', 'pixel', 'scifi'];

const STYLE_LABELS: Record<StyleType, string> = {
  anime: '2D 动漫',
  realistic: '3D 卡通',
  pixel: '像素风',
  scifi: '赛博朋克',
};

export function PetCreateStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const selectedStyle = useOnboardingStore((s) => s.selectedStyle);
  const setSelectedStyle = useOnboardingStore((s) => s.setSelectedStyle);
  const setCustomPrompt = useOnboardingStore((s) => s.setCustomPrompt);
  const user = useUserStore((s) => s.user);

  const recommended: StyleType[] = user?.mbti
    ? MBTI_STYLE_RECOMMENDATIONS[user.mbti as MBTIType]
    : ['anime'];

  const [activeStyle, setActiveStyle] = useState<StyleType>(selectedStyle ?? recommended[0]);
  const [aiMode, setAiMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const handleSelectStyle = useCallback((style: StyleType) => {
    setActiveStyle(style);
    setSelectedStyle(style);
    setAiMode(false);
    setAiFeedback(null);
  }, [setSelectedStyle]);

  const handleAiConfirm = useCallback(() => {
    const prompt = aiInput.trim();
    if (!prompt) return;
    setCustomPrompt(prompt);
    setAiFeedback('已记录你的创意，正式版将生成专属形象');
    Animated.timing(feedbackOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setActiveStyle('anime');
    setSelectedStyle('anime');
    setAiMode(false);
  }, [aiInput, setCustomPrompt, setSelectedStyle, feedbackOpacity]);

  const handleContinue = useCallback(() => {
    if (activeStyle) setStep('petBirth');
  }, [activeStyle, setStep]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>它将用何种视觉形态来到你身边？</Text>

        <View style={styles.reminderBox}>
          <Text style={styles.reminderEmoji}>🌟</Text>
          <Text style={styles.reminderText}>
            每只咕噜都是独一无二的灵魂伙伴。选定形象后，若想重塑需要消耗星尘，且进化形态将回到第一形态重新培养哦～请慎重选择～
          </Text>
        </View>

        <View style={styles.previewContainer}>
          <PetAvatar stage="baby" style={activeStyle} state="normal" size={150} animated />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleScroll}
        >
          {ALL_STYLES.map((style) => {
            const isSelected = activeStyle === style;
            return (
              <TouchableOpacity
                key={style}
                activeOpacity={0.8}
                style={[styles.styleCard, isSelected && styles.styleCardSelected]}
                onPress={() => handleSelectStyle(style)}
              >
                <Text style={[styles.styleCardText, isSelected && styles.styleCardTextSelected]}>
                  {STYLE_LABELS[style]}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.styleCard, styles.aiCard, aiMode && styles.styleCardSelected]}
            onPress={() => setAiMode(true)}
          >
            <Text style={[styles.styleCardText, aiMode && styles.styleCardTextSelected]}>
              ✨ AI 自定义
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {aiMode && (
          <View style={styles.aiInputBox}>
            <TextInput
              style={styles.aiInput}
              value={aiInput}
              onChangeText={setAiInput}
              placeholder="描述你想要的风格，如赛博朋克小狐狸"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={50}
              autoFocus
            />
            <TouchableOpacity
              style={styles.aiConfirm}
              onPress={handleAiConfirm}
              disabled={aiInput.trim().length === 0}
            >
              <Text style={styles.aiConfirmText}>确认</Text>
            </TouchableOpacity>
          </View>
        )}

        {aiFeedback && (
          <Animated.Text style={[styles.aiFeedback, { opacity: feedbackOpacity }]}>
            {aiFeedback}
          </Animated.Text>
        )}

        <TouchableOpacity onPress={handleContinue} disabled={!activeStyle}>
          <Text style={[styles.continueText, !activeStyle && styles.continueTextDisabled]}>
            继续
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.headline,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  reminderBox: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  reminderEmoji: {
    fontSize: 18,
  },
  reminderText: {
    flex: 1,
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
  },
  styleScroll: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  styleCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    minWidth: 64,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 10,
    elevation: 0,
  },
  styleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    shadowOpacity: 0.8,
    elevation: 8,
  },
  styleCardText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textPrimary,
  },
  styleCardTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  aiCard: {
    borderStyle: 'dashed',
  },
  aiInputBox: {
    width: '100%',
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  aiInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  aiConfirm: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  aiConfirmText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  aiFeedback: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  continueText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  continueTextDisabled: {
    color: theme.colors.textTertiary,
  },
});

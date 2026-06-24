/**
 * 咕噜 Gulu — 引导流程 Step 2: 认知棱镜（S/N，2 题）
 * 对应需求文档 3.4 Step 2：认知棱镜
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useMBTIQuestions } from '../../hooks/useMBTIQuestions';

export function CognitionPrismStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const { currentQuestion, selected, selectOption, isDone } = useMBTIQuestions('SN');

  const leftOpacity = useRef(new Animated.Value(0.5)).current;
  const leftScale = useRef(new Animated.Value(1)).current;
  const rightOpacity = useRef(new Animated.Value(0.5)).current;
  const rightScale = useRef(new Animated.Value(1)).current;
  const beamOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDone) setStep('woundMirror');
  }, [isDone, setStep]);

  useEffect(() => {
    if (!selected) {
      Animated.parallel([
        Animated.timing(leftOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }),
        Animated.timing(leftScale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(rightOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }),
        Animated.timing(rightScale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(beamOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      return;
    }
    const isLeft = selected === 'S';
    Animated.parallel([
      Animated.timing(leftOpacity, { toValue: isLeft ? 1 : 0.3, duration: 300, useNativeDriver: true }),
      Animated.timing(leftScale, { toValue: isLeft ? 1.15 : 1, duration: 300, useNativeDriver: true }),
      Animated.timing(rightOpacity, { toValue: isLeft ? 0.3 : 1, duration: 300, useNativeDriver: true }),
      Animated.timing(rightScale, { toValue: isLeft ? 1 : 1.15, duration: 300, useNativeDriver: true }),
      Animated.timing(beamOpacity, { toValue: isLeft ? 1 : 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [selected, leftOpacity, leftScale, rightOpacity, rightScale, beamOpacity]);

  if (!currentQuestion) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{currentQuestion.question}</Text>

      <View style={styles.visual}>
        <Animated.View
          style={[
            styles.lens,
            styles.leftLens,
            {
              opacity: leftOpacity,
              transform: [{ scale: leftScale }],
              borderColor: theme.colors.textSecondary,
              shadowColor: isLeftSelected(selected) ? theme.colors.primaryLight : theme.colors.border,
            },
          ]}
        >
          <View style={styles.detailGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={styles.detailDot} />
            ))}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.beam,
            { opacity: beamOpacity, backgroundColor: theme.colors.primaryLight },
          ]}
        />

        <Animated.View
          style={[
            styles.lens,
            styles.rightLens,
            {
              opacity: rightOpacity,
              transform: [{ scale: rightScale }],
              borderColor: theme.colors.textSecondary,
              shadowColor: selected === 'N' ? theme.colors.primaryLight : theme.colors.border,
            },
          ]}
        >
          <View style={styles.starField}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={[styles.star, { opacity: 0.4 + (i % 3) * 0.2 }]} />
            ))}
          </View>
        </Animated.View>
      </View>

      <View style={styles.optionsRow}>
        {currentQuestion.options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.8}
              style={[styles.optionCard, isSelected && styles.optionSelected]}
              onPress={() => selectOption(option.value)}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function isLeftSelected(value: string | null): boolean {
  return value === 'S';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  question: {
    fontSize: theme.fontSize.headline,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  visual: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lens: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: theme.radius.full,
    borderWidth: 3,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
  },
  leftLens: {
    left: 30,
    top: '30%',
  },
  rightLens: {
    right: 30,
    top: '30%',
  },
  detailGrid: {
    width: 80,
    height: 80,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.textTertiary,
  },
  starField: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
  },
  beam: {
    position: 'absolute',
    width: 4,
    height: 160,
    left: '48%',
    top: '32%',
    borderRadius: theme.radius.full,
    shadowColor: theme.colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  optionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    minHeight: 110,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  optionText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

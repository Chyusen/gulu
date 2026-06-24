/**
 * 咕噜 Gulu — 引导流程 Step 3: 伤痕映射（F/T，2 题）
 * 对应需求文档 3.5 Step 3：伤痕映射
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useMBTIQuestions } from '../../hooks/useMBTIQuestions';

export function WoundMirrorStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const { currentQuestion, selected, selectOption, isDone } = useMBTIQuestions('TF');

  const leftOpacity = useRef(new Animated.Value(1)).current;
  const rightOpacity = useRef(new Animated.Value(1)).current;
  const leftTranslateX = useRef(new Animated.Value(0)).current;
  const rightTranslateX = useRef(new Animated.Value(0)).current;
  const selectedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDone) setStep('fateCompass');
  }, [isDone, setStep]);

  useEffect(() => {
    if (!selected) {
      selectedScale.setValue(1);
      Animated.parallel([
        Animated.timing(leftOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(rightOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(leftTranslateX, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(rightTranslateX, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }

    const isLeft = selected === 'F';
    Animated.parallel([
      Animated.timing(leftOpacity, { toValue: isLeft ? 1 : 0.3, duration: 300, useNativeDriver: true }),
      Animated.timing(rightOpacity, { toValue: isLeft ? 0.3 : 1, duration: 300, useNativeDriver: true }),
      Animated.timing(leftTranslateX, { toValue: isLeft ? 60 : 0, duration: 400, useNativeDriver: true }),
      Animated.timing(rightTranslateX, { toValue: isLeft ? 0 : -60, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(selectedScale, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(selectedScale, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();
    });
  }, [selected, leftOpacity, rightOpacity, leftTranslateX, rightTranslateX, selectedScale]);

  if (!currentQuestion) return null;

  const leftOption = currentQuestion.options.find((o) => o.value === 'F');
  const rightOption = currentQuestion.options.find((o) => o.value === 'T');

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{currentQuestion.question}</Text>

      <View style={styles.visual}>
        <Animated.View
          style={[
            styles.gem,
            styles.ruby,
            {
              opacity: leftOpacity,
              transform: [
                { rotate: '45deg' },
                { translateX: leftTranslateX },
                { scale: selected === 'F' ? selectedScale : 1 },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.gem,
            styles.sapphire,
            {
              opacity: rightOpacity,
              transform: [
                { rotate: '45deg' },
                { translateX: rightTranslateX },
                { scale: selected === 'T' ? selectedScale : 1 },
              ],
            },
          ]}
        />
      </View>

      <View style={styles.optionsRow}>
        {leftOption && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.optionCard, selected === 'F' && styles.optionSelected]}
            onPress={() => selectOption('F')}
          >
            <Text style={[styles.optionText, selected === 'F' && styles.optionTextSelected]}>
              {leftOption.text}
            </Text>
          </TouchableOpacity>
        )}
        {rightOption && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.optionCard, selected === 'T' && styles.optionSelected]}
            onPress={() => selectOption('T')}
          >
            <Text style={[styles.optionText, selected === 'T' && styles.optionTextSelected]}>
              {rightOption.text}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
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
  gem: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: theme.radius.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 12,
  },
  ruby: {
    left: 50,
    top: '35%',
    backgroundColor: theme.colors.error,
    shadowColor: theme.colors.error,
    transform: [{ rotate: '45deg' }],
  },
  sapphire: {
    right: 50,
    top: '35%',
    backgroundColor: theme.colors.info,
    shadowColor: theme.colors.info,
    transform: [{ rotate: '45deg' }],
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

/**
 * 咕噜 Gulu — 引导流程 Step 1: 能量场校准（I/E，2 题）
 * 对应需求文档 3.3 Step 1：能量场校准
 *
 * 天平动画：左右两个星系代表天平两端，中央旋钮随选择旋转。
 * - 初始：左右高度一致、亮度一致
 * - 选右(I)：旋钮顺时针 30°，右亮+下降 20px，左暗+上升 20px
 * - 选左(E)：旋钮逆时针 30°，左亮+下降 20px，右暗+上升 20px
 * - 主动画 500ms Easing.out(Easing.cubic)，末尾轻微 spring 回弹
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import { theme } from '../../constants/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useMBTIQuestions } from '../../hooks/useMBTIQuestions';

export function EnergyFieldStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const { currentQuestion, selected, selectOption, isDone } = useMBTIQuestions('EI');

  // 天平动画值
  const knobRotation = useRef(new Animated.Value(0)).current;
  const leftTranslateY = useRef(new Animated.Value(0)).current;
  const rightTranslateY = useRef(new Animated.Value(0)).current;
  const leftOpacity = useRef(new Animated.Value(0.5)).current;
  const rightOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isDone) setStep('cognitionPrism');
  }, [isDone, setStep]);

  useEffect(() => {
    if (!selected) {
      // 重置为初始状态：左右高度一致、亮度一致
      Animated.parallel([
        Animated.timing(knobRotation, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(leftTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rightTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(leftOpacity, {
          toValue: 0.5,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rightOpacity, {
          toValue: 0.5,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // E 为左选项，I 为右选项
    const isLeft = selected === 'E';
    const targetRotation = isLeft ? -30 : 30;
    const targetLeftY = isLeft ? 20 : -20;
    const targetRightY = isLeft ? -20 : 20;
    const targetLeftOpacity = isLeft ? 1 : 0.3;
    const targetRightOpacity = isLeft ? 0.3 : 1;

    // 轻微过冲值，用于末尾 spring 回弹
    const rotOvershoot = targetRotation + (targetRotation > 0 ? 5 : -5);
    const leftOvershoot = targetLeftY + (targetLeftY > 0 ? 5 : -5);
    const rightOvershoot = targetRightY + (targetRightY > 0 ? 5 : -5);

    Animated.sequence([
      // 主动画：500ms，Easing.out(Easing.cubic)，到达过冲值
      Animated.parallel([
        Animated.timing(knobRotation, {
          toValue: rotOvershoot,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(leftTranslateY, {
          toValue: leftOvershoot,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rightTranslateY, {
          toValue: rightOvershoot,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(leftOpacity, {
          toValue: targetLeftOpacity,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rightOpacity, {
          toValue: targetRightOpacity,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 末尾轻微 spring 回弹（friction: 8, tension: 40）
      Animated.parallel([
        Animated.spring(knobRotation, {
          toValue: targetRotation,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(leftTranslateY, {
          toValue: targetLeftY,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(rightTranslateY, {
          toValue: targetRightY,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [selected, knobRotation, leftTranslateY, rightTranslateY, leftOpacity, rightOpacity]);

  if (!currentQuestion) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{currentQuestion.question}</Text>

      <View style={styles.visual}>
        {/* 左侧星系（天平左盘） */}
        <Animated.View
          style={[
            styles.galaxy,
            styles.leftGalaxy,
            {
              opacity: leftOpacity,
              transform: [{ translateY: leftTranslateY }],
              backgroundColor: theme.colors.warning,
            },
          ]}
        />

        {/* 右侧星系（天平右盘） */}
        <Animated.View
          style={[
            styles.galaxy,
            styles.rightGalaxy,
            {
              opacity: rightOpacity,
              transform: [{ translateY: rightTranslateY }],
              backgroundColor: theme.colors.primaryLight,
            },
          ]}
        />

        {/* 中央旋钮 */}
        <View style={styles.knobContainer} pointerEvents="none">
          <View style={styles.knobBase} />
          <Animated.View
            style={[
              styles.knob,
              {
                transform: [
                  {
                    rotate: knobRotation.interpolate({
                      inputRange: [-180, 180],
                      outputRange: ['-180deg', '180deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.knobIndicator} />
          </Animated.View>
        </View>
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
  galaxy: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: theme.radius.full,
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  leftGalaxy: {
    left: -60,
    top: '25%',
    shadowColor: theme.colors.warning,
  },
  rightGalaxy: {
    right: -60,
    top: '25%',
    shadowColor: theme.colors.primaryLight,
  },
  knobContainer: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: 80,
    height: 60,
  },
  knobBase: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  knob: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  knobIndicator: {
    width: 4,
    height: 30,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
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

/**
 * 咕噜 Gulu — 引导流程 Step 4: 命运罗盘（J/P，2 题）
 * 对应需求文档 3.6 Step 4：命运罗盘
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useUserStore } from '../../stores/userStore';
import { useMBTIQuestions } from '../../hooks/useMBTIQuestions';
import { calculateMBTI } from '../../constants/mbti';


export function FateCompassStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const answers = useOnboardingStore((s) => s.mbtiAnswers);
  const updateMBTI = useUserStore((s) => s.updateMBTI);
  const { currentQuestion, selected, selectOption, isDone } = useMBTIQuestions('JP');

  const pointerRotation = useRef(new Animated.Value(0)).current;
  const plannedOpacity = useRef(new Animated.Value(0.4)).current;
  const freeOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isDone) {
      const mbti = calculateMBTI(answers);
      updateMBTI(mbti);
      setStep('zodiac');
    }
  }, [isDone, answers, updateMBTI, setStep]);

  useEffect(() => {
    if (!selected) {
      Animated.parallel([
        Animated.spring(pointerRotation, { toValue: 0, useNativeDriver: true }),
        Animated.timing(plannedOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(freeOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }
    const isPlanned = selected === 'J';
    Animated.parallel([
      Animated.spring(pointerRotation, { toValue: isPlanned ? -45 : 135, useNativeDriver: true }),
      Animated.timing(plannedOpacity, { toValue: isPlanned ? 1 : 0.3, duration: 300, useNativeDriver: true }),
      Animated.timing(freeOpacity, { toValue: isPlanned ? 0.3 : 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [selected, pointerRotation, plannedOpacity, freeOpacity]);

  if (!currentQuestion) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{currentQuestion.question}</Text>

      <View style={styles.compassArea}>
        <View style={styles.compass}>
          <Animated.View
            style={[
              styles.pointer,
              {
                transform: [
                  {
                    rotate: pointerRotation.interpolate({
                      inputRange: [-45, 135],
                      outputRange: ['-45deg', '135deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        <Animated.View style={[styles.route, styles.plannedRoute, { opacity: plannedOpacity }]}>
          <View style={[styles.routeLine, { backgroundColor: theme.colors.textSecondary }]} />
          <Text style={styles.routeText}>规划航线</Text>
        </Animated.View>

        <Animated.View style={[styles.route, styles.freeRoute, { opacity: freeOpacity }]}>
          <View style={[styles.routeLine, { backgroundColor: theme.colors.primaryLight }]} />
          <Text style={styles.routeText}>自由航线</Text>
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
  compassArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compass: {
    width: 160,
    height: 160,
    borderRadius: theme.radius.full,
    borderWidth: 4,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointer: {
    width: 4,
    height: 110,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  route: {
    position: 'absolute',
    alignItems: 'center',
  },
  plannedRoute: {
    top: '20%',
    right: 60,
  },
  freeRoute: {
    bottom: '20%',
    left: 60,
  },
  routeLine: {
    width: 80,
    height: 3,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.sm,
  },
  routeText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
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

/**
 * 咕噜 Gulu — 引导流程 Step 5: 灵魂星图（星座）
 * 对应需求文档 3.7 Step 5：灵魂星图
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ScrollPicker } from '../../components/ScrollPicker';
import { theme } from '../../constants/theme';
import { calculateZodiac } from '../../constants/mbti';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useUserStore } from '../../stores/userStore';
import type { ZodiacType } from '../../types';

const ZODIACS: ZodiacType[] = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座',
];

const ZODIAC_DATE_MAP: Record<ZodiacType, [number, number]> = {
  '白羊座': [3, 21],
  '金牛座': [4, 20],
  '双子座': [5, 21],
  '巨蟹座': [6, 22],
  '狮子座': [7, 23],
  '处女座': [8, 23],
  '天秤座': [9, 23],
  '天蝎座': [10, 24],
  '射手座': [11, 23],
  '摩羯座': [12, 22],
  '水瓶座': [1, 20],
  '双鱼座': [2, 19],
};

const ZODIAC_EMOJI: Record<ZodiacType, string> = {
  '白羊座': '♈', '金牛座': '♉', '双子座': '♊', '巨蟹座': '♋',
  '狮子座': '♌', '处女座': '♍', '天秤座': '♎', '天蝎座': '♏',
  '射手座': '♐', '摩羯座': '♑', '水瓶座': '♒', '双鱼座': '♓',
};

function getDaysInMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export function ZodiacStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const updateZodiac = useUserStore((s) => s.updateZodiac);

  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);

  const monthData = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${i + 1} 月`),
    []
  );
  const dayData = useMemo(
    () => Array.from({ length: getDaysInMonth(birthMonth) }, (_, i) => `${i + 1} 日`),
    [birthMonth]
  );

  const selected: ZodiacType = useMemo(
    () => calculateZodiac(birthMonth, birthDay),
    [birthMonth, birthDay]
  );

  useEffect(() => {
    updateZodiac(selected);
  }, [selected, updateZodiac]);

  const handleContinue = useCallback(() => {
    updateZodiac(selected);
    setStep('petCreate');
  }, [selected, setStep, updateZodiac]);

  const handleMonthChange = useCallback((index: number) => {
    setBirthMonth(index + 1);
    const maxDay = getDaysInMonth(index + 1);
    setBirthDay((prev) => Math.min(prev, maxDay));
  }, []);

  const handleDayChange = useCallback((index: number) => {
    setBirthDay(index + 1);
  }, []);

  const handleZodiacSelect = useCallback((zodiac: ZodiacType) => {
    const [month, day] = ZODIAC_DATE_MAP[zodiac];
    setBirthMonth(month);
    setBirthDay(day);
    updateZodiac(zodiac);
  }, [updateZodiac]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>你的灵魂降生于哪一片星图之下？</Text>
        <Text style={styles.subtitle}>滚动选择出生日期，或直接点击星座</Text>

        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>出生日期</Text>
          <View style={styles.pickerRow}>
            <ScrollPicker
              data={monthData}
              selectedIndex={birthMonth - 1}
              onChange={handleMonthChange}
            />
            <ScrollPicker
              data={dayData}
              selectedIndex={birthDay - 1}
              onChange={handleDayChange}
            />
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>你的星座是</Text>
            <Text style={styles.resultZodiac}>
              {ZODIAC_EMOJI[selected]} {selected}
            </Text>
          </View>
        </View>

        <Text style={styles.gridTitle}>或直接选择星座</Text>
        <View style={styles.zodiacGrid}>
          {ZODIACS.map((zodiac) => (
            <Pressable
              key={zodiac}
              style={({ pressed }) => [
                styles.zodiacCard,
                selected === zodiac && styles.zodiacCardSelected,
                pressed && styles.zodiacCardPressed,
              ]}
              onPress={() => handleZodiacSelect(zodiac)}
            >
              <Text style={styles.zodiacEmoji}>{ZODIAC_EMOJI[zodiac]}</Text>
              <Text
                style={[
                  styles.zodiacName,
                  selected === zodiac && styles.zodiacNameSelected,
                ]}
              >
                {zodiac}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.continueBtn,
          pressed && styles.continueBtnPressed,
        ]}
        onPress={handleContinue}
      >
        <Text style={styles.continueBtnText}>继续</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  dateContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  dateLabel: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    height: 200,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  resultLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  resultZodiac: {
    fontSize: theme.fontSize.headline,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  gridTitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  zodiacCard: {
    width: 70,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zodiacCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  zodiacEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  zodiacName: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  zodiacNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  zodiacCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  continueBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    margin: theme.spacing.lg,
    marginTop: 0,
  },
  continueBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  continueBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

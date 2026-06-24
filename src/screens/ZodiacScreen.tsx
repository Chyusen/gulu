/**
 * 咕噜 Gulu — 星座选择界面
 * 对应需求文档 2.3 星座选择 + 5. 滚动式日期选择器
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { ScrollPicker } from '../components/ScrollPicker';
import { theme } from '../constants/theme';
import { calculateZodiac } from '../constants/mbti';
import { useUserStore } from '../stores/userStore';
import type { ZodiacType } from '../types';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Zodiac'>;

const ZODIACS: ZodiacType[] = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座',
];

const ZODIAC_EMOJI: Record<ZodiacType, string> = {
  '白羊座': '♈', '金牛座': '♉', '双子座': '♊', '巨蟹座': '♋',
  '狮子座': '♌', '处女座': '♍', '天秤座': '♎', '天蝎座': '♏',
  '射手座': '♐', '摩羯座': '♑', '水瓶座': '♒', '双鱼座': '♓',
};

/** 获取指定月份的天数 */
function getDaysInMonth(month: number): number {
  if (month === 2) return 29; // 闰年兼容
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export function ZodiacScreen() {
  const navigation = useNavigation<NavProp>();
  const updateZodiac = useUserStore((s) => s.updateZodiac);

  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);

  // 月份/日期数据
  const monthData = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${i + 1} 月`),
    [],
  );
  const dayData = useMemo(
    () => Array.from({ length: getDaysInMonth(birthMonth) }, (_, i) => `${i + 1} 日`),
    [birthMonth],
  );

  // 实时计算星座
  const selected: ZodiacType = useMemo(
    () => calculateZodiac(birthMonth, birthDay),
    [birthMonth, birthDay],
  );

  const handleMonthChange = useCallback((index: number) => {
    setBirthMonth(index + 1);
    // 日期超出范围时自动调整
    const maxDay = getDaysInMonth(index + 1);
    setBirthDay((prev) => Math.min(prev, maxDay));
  }, []);

  const handleDayChange = useCallback((index: number) => {
    setBirthDay(index + 1);
  }, []);

  const handleZodiacSelect = useCallback((zodiac: ZodiacType) => {
    // 直接选择星座时，同步更新日期（取该星座起始日期）
    updateZodiac(zodiac);
    navigation.navigate('ProfileResult');
  }, [navigation, updateZodiac]);

  const handleConfirm = useCallback(() => {
    updateZodiac(selected);
    navigation.navigate('ProfileResult');
  }, [navigation, selected, updateZodiac]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>你的星座</Text>
        <Text style={styles.subtitle}>滚动选择出生日期，或直接点击星座</Text>

        {/* 滚动式日期选择器 */}
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
          {/* 实时星座结果 */}
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>你的星座是</Text>
            <Text style={styles.resultZodiac}>
              {ZODIAC_EMOJI[selected]} {selected}
            </Text>
          </View>
        </View>

        {/* 星座网格（直接选择） */}
        <Text style={styles.gridTitle}>或直接选择星座</Text>
        <View style={styles.zodiacGrid}>
          {ZODIACS.map((zodiac) => (
            <TouchableOpacity
              key={zodiac}
              style={[
                styles.zodiacCard,
                selected === zodiac && styles.zodiacCardSelected,
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
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: theme.spacing.xl }} />
        <Button
          title={`确认 ${selected}`}
          onPress={handleConfirm}
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
});

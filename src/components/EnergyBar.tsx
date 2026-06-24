/**
 * 咕噜 Gulu — 能量条 UI 组件
 * 对应需求文档 4.1.1 能量条UI
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface EnergyBarProps {
  energy: number;
  maxEnergy?: number;
  height?: number;
}

export function EnergyBar({ energy, maxEnergy = 100, height = 12 }: EnergyBarProps) {
  const percent = Math.max(0, Math.min(1, energy / maxEnergy));
  // 颜色变化：>70健康/30-70疲惫/<30虚弱
  const color =
    percent > 0.7
      ? theme.colors.energyHigh
      : percent > 0.3
      ? theme.colors.energyMedium
      : theme.colors.energyLow;

  return (
    <View style={[styles.track, { height, backgroundColor: theme.colors.backgroundTertiary }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${percent * 100}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});

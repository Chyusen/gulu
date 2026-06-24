/**
 * 咕噜 Gulu — 原生端地图视图占位
 * Web 端请使用 MapView.web.tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{ lng: number; lat: number; title?: string }>;
  circles?: Array<{ lng: number; lat: number; radius: number }>;
}

export function MapView({ center }: MapViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>地图视图</Text>
      <Text style={styles.hint}>原生端地图尚未接入，当前中心点：{center.join(',')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: 12,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

/**
 * 咕噜 Gulu — 侧边可展开菜单
 * 对应需求文档 3.4 侧边功能按钮
 * 左右各一组按钮，默认显示常用项，··· 展开全部
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { theme } from '../constants/theme';

interface SideMenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

interface SideMenuProps {
  side: 'left' | 'right';
  items: SideMenuItem[];
  /** 常驻显示的按钮数量，其余折叠 */
  persistentCount?: number;
}

export function SideMenu({ side, items, persistentCount = 2 }: SideMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandAnim] = useState(new Animated.Value(0));

  const handleToggle = useCallback(() => {
    const newValue = !expanded;
    setExpanded(newValue);
    Animated.spring(expandAnim, {
      toValue: newValue ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [expanded, expandAnim]);

  const persistentItems = items.slice(0, persistentCount);
  const hiddenItems = items.slice(persistentCount);

  const alignItems = side === 'left' ? 'flex-start' : 'flex-end';

  return (
    <View style={[styles.container, { alignItems }]}>
      {/* 常驻按钮 */}
      {persistentItems.map((item) => (
        <SideButton key={item.key} icon={item.icon} label={item.label} onPress={item.onPress} />
      ))}

      {/* 展开的按钮 */}
      {hiddenItems.map((item) => {
        return (
          <Animated.View
            key={item.key}
            style={{
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            <SideButton icon={item.icon} label={item.label} onPress={item.onPress} />
          </Animated.View>
        );
      })}

      {/* 展开按钮 */}
      {hiddenItems.length > 0 && (
        <TouchableOpacity style={styles.expandBtn} onPress={handleToggle} activeOpacity={0.7}>
          <Text style={styles.expandEmoji}>⋯</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** 单个侧边按钮 */
function SideButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.btnCircle}>{icon}</View>
      <Text style={styles.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  btn: {
    alignItems: 'center',
  },
  btnCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${theme.colors.backgroundTertiary}CC`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } : {}),
  },
  btnLabel: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    marginTop: 2,
    fontWeight: '500',
  },
  expandBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${theme.colors.surface}99`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expandEmoji: {
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
});

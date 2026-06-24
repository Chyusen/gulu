/**
 * 咕噜 Gulu — 底部三按钮导航栏
 * 对应需求文档 4.2 底部三按钮
 * 布局：探索（左）、对话（正中间）、个人中心（右）
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { theme } from '../constants/theme';

interface BottomNavBarProps {
  onChat: () => void;
  onExplore: () => void;
  onProfile: () => void;
}

export function BottomNavBar({ onChat, onExplore, onProfile }: BottomNavBarProps) {
  return (
    <View style={styles.container}>
      {/* 探索（左） */}
      <TouchableOpacity style={styles.sideBtn} onPress={onExplore} activeOpacity={0.7}>
        <View style={styles.sideBtnCircle}>
          <Image source={require('../assets/images/ui/icons/nav/explore_nav.png')} style={styles.navIcon} resizeMode="contain" />
        </View>
        <Text style={styles.sideBtnLabel}>探索</Text>
      </TouchableOpacity>

      {/* 对话（正中间） */}
      <TouchableOpacity style={styles.centerBtn} onPress={onChat} activeOpacity={0.7}>
        <View style={styles.centerBtnCircle}>
          <Image source={require('../assets/images/ui/icons/nav/chat_nav.png')} style={styles.centerNavIcon} resizeMode="contain" />
        </View>
        <Text style={styles.centerBtnLabel}>对话</Text>
      </TouchableOpacity>

      {/* 个人中心（右） */}
      <TouchableOpacity style={styles.sideBtn} onPress={onProfile} activeOpacity={0.7}>
        <View style={styles.sideBtnCircle}>
          <Image source={require('../assets/images/ui/icons/nav/profile_nav.png')} style={styles.navIcon} resizeMode="contain" />
        </View>
        <Text style={styles.sideBtnLabel}>我的</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 90,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(45, 27, 78, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 115, 255, 0.3)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
  },
  sideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  sideBtnCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 115, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 115, 255, 0.4)',
  },
  sideBtnLabel: {
    fontSize: 11,
    color: '#B0B5BD',
    marginTop: 3,
  },
  navIcon: {
    width: 62,
    height: 62,
    resizeMode: 'cover',
  },
  centerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerBtnCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...({
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 6,
    } as object),
  },
  centerBtnLabel: {
    fontSize: 11,
    color: theme.colors.primaryLight,
    marginTop: 3,
    fontWeight: '600',
  },
  centerNavIcon: {
    width: 70,
    height: 70,
    resizeMode: 'cover',
  },
});

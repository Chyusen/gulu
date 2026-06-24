/**
 * 咕噜 Gulu — 探索隐私设置面板
 * 对应需求文档 4.8 探索隐私设置
 * 首次进入探索界面自动弹出，后续可通过设置按钮打开
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../constants/theme';
import { useExploreStore } from '../stores/exploreStore';

interface ExplorePrivacyPanelProps {
  visible: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

export function ExplorePrivacyPanel({ visible, onClose, isFirstTime = false }: ExplorePrivacyPanelProps) {
  const privacy = useExploreStore((s) => s.privacy);
  const updatePrivacy = useExploreStore((s) => s.updatePrivacy);
  const setFirstVisitDone = useExploreStore((s) => s.setFirstVisitDone);

  const handleToggle = (key: keyof typeof privacy) => {
    updatePrivacy({ [key]: !privacy[key] });
  };

  const handleConfirm = () => {
    if (isFirstTime) {
      setFirstVisitDone();
    }
    onClose();
  };

  const items: { key: keyof typeof privacy; label: string; icon: string }[] = [
    { key: 'showGender', label: '向附近用户展示我的性别', icon: '⚥' },
    { key: 'showMBTI', label: '向附近用户展示我的 MBTI', icon: '🌟' },
    { key: 'showZodiac', label: '向附近用户展示我的星座', icon: '♈' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleConfirm} />
        <View style={styles.panel}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>
            {isFirstTime ? '先设置一下探索隐私吧' : '探索隐私设置'}
          </Text>
          <Text style={styles.subtitle}>
            默认全部关闭，你的信息只展示给想展示的人～
          </Text>

          <View style={styles.list}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.item}
                onPress={() => handleToggle(item.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <View style={[styles.toggle, privacy[item.key] && styles.toggleOn]}>
                  <View style={[styles.thumb, privacy[item.key] && styles.thumbOn]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmBtnText}>
              {isFirstTime ? '我设置好啦' : '完成'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textTertiary,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  list: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  itemLabel: {
    flex: 1,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.backgroundTertiary,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: theme.colors.success,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.textInverse,
  },
  thumbOn: {
    marginLeft: 22,
  },
  confirmBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
  },
});

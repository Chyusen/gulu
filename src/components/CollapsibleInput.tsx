/**
 * 咕噜 Gulu — 可收起输入框
 * 对应需求文档 6.1~6.3 输入框设计
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
} from 'react-native';
import { theme } from '../constants/theme';

interface CollapsibleInputProps {
  expanded: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CollapsibleInput({
  expanded,
  value,
  onChangeText,
  onSend,
  onExpand,
  onCollapse,
  placeholder = '说点什么...',
  disabled = false,
}: CollapsibleInputProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expanded, slideAnim]);

  // 收起时关闭键盘
  useEffect(() => {
    if (!expanded) {
      Keyboard.dismiss();
    }
  }, [expanded]);

  if (!expanded) {
    // 收起状态：显示圆形对话按钮
    return (
      <View style={styles.collapsedContainer}>
        <TouchableOpacity style={styles.chatButton} onPress={onExpand}>
          <Text style={styles.chatButtonIcon}>💬</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 展开状态：输入框从底部滑入
  return (
    <Animated.View
      style={[
        styles.expandedContainer,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [200, 0],
            }),
          }],
        },
      ]}
    >
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.collapseBtn} onPress={onCollapse}>
          <Text style={styles.collapseIcon}>▼</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={500}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!value.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!value.trim() || disabled}
        >
          <Text style={styles.sendText}>发送</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  collapsedContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  chatButtonIcon: {
    fontSize: 24,
  },
  expandedContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
});

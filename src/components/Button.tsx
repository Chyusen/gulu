/**
 * 咕噜 Gulu — 通用按钮组件
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const sizeStyles = {
    sm: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, fontSize: theme.fontSize.caption },
    md: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, fontSize: theme.fontSize.body },
    lg: { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xl, fontSize: theme.fontSize.subtitle },
  };

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  const textColor =
    variant === 'outline' || variant === 'ghost'
      ? theme.colors.primary
      : theme.colors.textInverse;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        variantStyles[variant],
        { paddingVertical: sizeStyles[size].paddingVertical, paddingHorizontal: sizeStyles[size].paddingHorizontal },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize: sizeStyles[size].fontSize }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

/**
 * 咕噜 Gulu — 主题系统
 * 所有颜色从主题配置读取，无硬编码
 */

import type { StyleType } from '../types';

export interface ThemeColors {
  // 主色调
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;

  // 背景色
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;

  // 文本色
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // 状态色
  success: string;
  warning: string;
  error: string;
  info: string;

  // 能量色
  energyHigh: string;
  energyMedium: string;
  energyLow: string;

  // 情绪色
  emotionHappy: string;
  emotionCalm: string;
  emotionSad: string;
  emotionAnxious: string;

  // 边框与分割
  border: string;
  divider: string;

  // 渐变
  gradientStart: string;
  gradientEnd: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeFontSize {
  caption: number;
  body: number;
  subtitle: number;
  title: number;
  headline: number;
  largeTitle: number;
}

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  fontSize: ThemeFontSize;
  radius: ThemeRadius;
}

/** 浅色主题：紫色神秘风格 */
export const lightTheme: Theme = {
  colors: {
    primary: '#6B4EE6',
    primaryLight: '#9B7BFF',
    primaryDark: '#5036B8',
    secondary: '#C084FC',
    accent: '#D099FF',

    background: '#1A1225',
    backgroundSecondary: '#241636',
    backgroundTertiary: '#2D1F3D',
    surface: '#2D1F3D',

    textPrimary: '#F3E8FF',
    textSecondary: '#A69CB8',
    textTertiary: '#7A708C',
    textInverse: '#F3E8FF',

    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#8B5CF6',

    energyHigh: '#22C55E',
    energyMedium: '#F59E0B',
    energyLow: '#EF4444',

    emotionHappy: '#D099FF',
    emotionCalm: '#9B7BFF',
    emotionSad: '#7A708C',
    emotionAnxious: '#C084FC',

    border: '#3D2F55',
    divider: '#36264D',

    gradientStart: '#1A1225',
    gradientEnd: '#241636',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontSize: {
    caption: 12,
    body: 14,
    subtitle: 16,
    title: 18,
    headline: 22,
    largeTitle: 28,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};

/** 深色主题：紫色神秘风格（与浅色统一，营造沉浸式宇宙感） */
export const darkTheme: Theme = {
  colors: {
    primary: '#7C5CFF',
    primaryLight: '#A88FFF',
    primaryDark: '#6348D6',
    secondary: '#C084FC',
    accent: '#D099FF',

    background: '#110C18',
    backgroundSecondary: '#1A1025',
    backgroundTertiary: '#221430',
    surface: '#241636',

    textPrimary: '#F3E8FF',
    textSecondary: '#948CA8',
    textTertiary: '#6A6278',
    textInverse: '#F3E8FF',

    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#A78BFA',

    energyHigh: '#4ADE80',
    energyMedium: '#FBBF24',
    energyLow: '#F87171',

    emotionHappy: '#D099FF',
    emotionCalm: '#A88FFF',
    emotionSad: '#948CA8',
    emotionAnxious: '#C084FC',

    border: '#302244',
    divider: '#2A1C3D',

    gradientStart: '#110C18',
    gradientEnd: '#1A1025',
  },
  spacing: lightTheme.spacing,
  fontSize: lightTheme.fontSize,
  radius: lightTheme.radius,
};

/** 默认主题 */
export const theme = lightTheme;

/** 4 种 Demo 风格的 CSS 滤镜配置 */
export const STYLE_FILTERS: Record<StyleType, string> = {
  anime: 'saturate(1.3) contrast(1.1) brightness(1.05)',
  realistic: 'saturate(0.95) contrast(1.0) brightness(1.0)',
  pixel: 'contrast(1.5) brightness(0.9) saturate(0.8)',
  scifi: 'hue-rotate(180deg) brightness(1.1) saturate(1.2)',
};

/**
 * 咕噜 Gulu — 宠物形象组件
 * 对应需求文档 3.2 风格切换 / 3.3 状态变体
 * 沉浸式改造：支持呼吸/眨眼/表情/互动动画
 */

import React from 'react';
import { Image, StyleSheet, View, ImageStyle, Animated, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { AssetManager } from '../utils/AssetManager';
import { usePetAnimation, type InteractionAnimation } from '../hooks/usePetAnimation';
import { STYLE_FILTERS } from '../constants/theme';
import type { PetStage, StyleType, PetState, PetEmotion } from '../types';

interface PetAvatarProps {
  stage: PetStage;
  style: StyleType;
  state?: PetState;
  emotion?: PetEmotion;
  size?: number;
  grayingSeverity?: number;
  /** 互动触发动画 */
  interaction?: InteractionAnimation;
  /** 是否启用动画（沉浸式界面用） */
  animated?: boolean;
}

/** 根据宠物状态/情绪选择 Lottie 动画 */
function getLottieName(state: PetState, emotion: PetEmotion): string | null {
  if (state === 'graying') return 'pet_graying';
  if (state === 'dormant') return 'pet_sleep';
  if (state === 'happy' || emotion === 'happy' || emotion === 'excited') return 'pet_happy';
  if (state === 'sad' || emotion === 'sad' || emotion === 'anxious') return 'pet_sad';
  return 'pet_idle';
}

/** 是否可使用 Lottie：仅 anime 风格在常规状态下使用，其余风格/灰化/沉睡用静态图 */
function canUseLottie(style: StyleType, state: PetState): boolean {
  if (Platform.OS === 'web') return false;
  if (style !== 'anime') return false;
  if (state === 'graying' || state === 'dormant') return false;
  return true;
}

/** 灰化滤镜：grayscale + brightness，按 severity 递进 */
function getGrayingFilter(severity: number): ImageStyle {
  const intensity = Math.min(severity / 5, 1);
  const grayscale = 0.3 + intensity * 0.5; // 0.3~0.8
  const brightness = 1 - intensity * 0.3;   // 1.0~0.7
  return {
    opacity: 1 - intensity * 0.2,
    filter: `grayscale(${grayscale}) brightness(${brightness})`,
  } as ImageStyle;
}

/** 荆棘效果：按 severity 渲染不同密度的荆棘 overlay */
function ThornsOverlay({ severity, size }: { severity: number; size: number }) {
  if (severity < 2) return null;
  const thornCount = Math.min(severity * 3, 15);
  const thorns = Array.from({ length: thornCount }, (_, i) => {
    const angle = (i / thornCount) * Math.PI * 2;
    const radius = size * 0.42;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const length = 8 + severity * 2;
    return (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: size / 2 + x - 1,
          top: size / 2 + y - length / 2,
          width: 2,
          height: length,
          backgroundColor: '#3a2a1a',
          transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
          borderRadius: 1,
          opacity: 0.4 + severity * 0.1,
        }}
      />
    );
  });
  return <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>{thorns}</View>;
}

export function PetAvatar({
  stage,
  style,
  state = 'normal',
  emotion = 'normal',
  size = 200,
  grayingSeverity = 0,
  interaction = null,
  animated = false,
}: PetAvatarProps) {
  const source = AssetManager.getPetImage(stage, style, state);
  // 动画 Hook 必须在所有 return 之前调用
  const anim = usePetAnimation(emotion, interaction);

  // 风格滤镜 + 灰化滤镜组合
  const getFilterStyle = (): ImageStyle => {
    const styleFilter = STYLE_FILTERS[style] || '';
    const result: Record<string, unknown> = {};

    if (state === 'graying' && grayingSeverity > 0) {
      const graying = getGrayingFilter(grayingSeverity);
      Object.assign(result, graying);
    } else if (state === 'dormant') {
      result.opacity = 0.5;
    }

    // 应用风格滤镜（RN 0.74+ 支持 filter 属性）
    if (styleFilter && Platform.OS !== 'web') {
      result.filter = styleFilter;
    }

    return result as ImageStyle;
  };

  // 非动画模式：直接渲染静态图片
  if (!animated) {
    const imageStyle: ImageStyle = {
      width: size,
      height: size,
      ...getFilterStyle(),
    };
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Image source={source} style={imageStyle} resizeMode="contain" />
        {state === 'graying' && grayingSeverity >= 2 && (
          <ThornsOverlay severity={grayingSeverity} size={size} />
        )}
      </View>
    )
  }

  // 动画模式：沉浸式界面，优先使用 Lottie，回退到静态图
  const lottieName = animated ? getLottieName(state, emotion) : null;
  const lottieSource = lottieName ? AssetManager.getLottieAnimation(lottieName) : null;
  const useLottie = animated && lottieSource && canUseLottie(style, state);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          transform: [
            { scale: anim.interactionScale },
            { translateY: anim.interactionTranslateY },
            { scale: anim.breathScale },
            { translateY: anim.emotionTranslateY },
            { rotate: anim.emotionRotate.interpolate({
                inputRange: [-360, 360],
                outputRange: ['-360deg', '360deg'],
              }) },
            { translateX: anim.shakeTranslateX },
            { scaleY: anim.blinkScaleY },
          ],
          opacity: anim.emotionOpacity,
        }}
      >
        {useLottie ? (
          <LottieView
            source={lottieSource}
            autoPlay
            loop
            style={{ width: size, height: size }}
          />
        ) : (
          <Image
            source={source}
            style={{ width: size, height: size, ...getFilterStyle() }}
            resizeMode="contain"
          />
        )}
        {state === 'graying' && grayingSeverity >= 2 && (
          <ThornsOverlay severity={grayingSeverity} size={size} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * 咕噜 Gulu — 宠物动画组合 Hook
 * 对应需求文档 3.1 呼吸循环 / 3.2 眨眼 / 3.3 表情变化
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import type { PetEmotion } from '../types';

// ========== 动画配置 ==========

export const BREATH_CONFIG = {
  normal: { scaleMin: 1.0, scaleMax: 1.03, duration: 3000 },
  happy: { scaleMin: 1.0, scaleMax: 1.05, duration: 1500 },
  sad: { scaleMin: 0.98, scaleMax: 1.01, duration: 4000 },
  graying: { scaleMin: 0.97, scaleMax: 1.01, duration: 5000 },
  dormant: { scaleMin: 0.95, scaleMax: 0.97, duration: 8000 },
  excited: { scaleMin: 1.0, scaleMax: 1.06, duration: 1200 },
  anxious: { scaleMin: 0.99, scaleMax: 1.02, duration: 2000 },
};

const BLINK_CONFIG = {
  intervalMin: 2000,
  intervalMax: 6000,
  duration: 150,
  probability: 0.7,
};

export type InteractionAnimation = 'pet' | 'poke' | 'hug' | 'kiss' | 'feed' | 'double_tap' | null;

export interface PetAnimationControllers {
  breathScale: Animated.Value;
  blinkScaleY: Animated.Value;
  emotionTranslateY: Animated.Value;
  emotionRotate: Animated.Value;
  emotionOpacity: Animated.Value;
  shakeTranslateX: Animated.Value;
  interactionScale: Animated.Value;
  interactionTranslateY: Animated.Value;
}

export function usePetAnimation(
  emotion: PetEmotion = 'normal',
  interaction: InteractionAnimation = null
) {
  // Animated values
  const breathScale = useRef(new Animated.Value(1)).current;
  const blinkScaleY = useRef(new Animated.Value(1)).current;
  const emotionTranslateY = useRef(new Animated.Value(0)).current;
  const emotionRotate = useRef(new Animated.Value(0)).current;
  const emotionOpacity = useRef(new Animated.Value(1)).current;
  const shakeTranslateX = useRef(new Animated.Value(0)).current;
  const interactionScale = useRef(new Animated.Value(1)).current;
  const interactionTranslateY = useRef(new Animated.Value(0)).current;

  // Refs for loops so we can stop them
  const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const emotionRef = useRef<PetEmotion>(emotion);

  // ========== 呼吸动画 ==========
  const startBreath = useCallback((emo: PetEmotion) => {
    breathLoopRef.current?.stop();
    const cfg = BREATH_CONFIG[emo] ?? BREATH_CONFIG.normal;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: cfg.scaleMax,
          duration: cfg.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: cfg.scaleMin,
          duration: cfg.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breathLoopRef.current = loop;
    loop.start();
  }, [breathScale]);

  // ========== 眨眼动画 ==========
  const doBlink = useCallback(() => {
    // 眨眼期间暂停呼吸动画
    breathLoopRef.current?.stop();
    Animated.sequence([
      Animated.timing(blinkScaleY, {
        toValue: 0.1,
        duration: BLINK_CONFIG.duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(blinkScaleY, {
        toValue: 1,
        duration: BLINK_CONFIG.duration / 2,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 眨眼结束后恢复呼吸动画
      startBreath(emotionRef.current);
    });
  }, [blinkScaleY, startBreath]);

  const scheduleBlink = useCallback(() => {
    const delay = BLINK_CONFIG.intervalMin +
      Math.random() * (BLINK_CONFIG.intervalMax - BLINK_CONFIG.intervalMin);
    blinkTimerRef.current = setTimeout(() => {
      if (Math.random() < BLINK_CONFIG.probability) {
        doBlink();
      }
      scheduleBlink();
    }, delay);
  }, [doBlink]);

  // ========== 情绪动画 ==========
  const applyEmotion = useCallback((emo: PetEmotion) => {
    // 停止之前的特殊循环
    shakeLoopRef.current?.stop();
    shakeTranslateX.setValue(0);

    switch (emo) {
      case 'happy':
        // 快速弹跳
        Animated.parallel([
          Animated.spring(emotionTranslateY, {
            toValue: -8,
            useNativeDriver: true,
            tension: 40,
            friction: 4,
          }),
          Animated.spring(emotionRotate, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'sad':
        // 低头
        Animated.parallel([
          Animated.timing(emotionTranslateY, {
            toValue: 10,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(emotionRotate, {
            toValue: 5,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'graying':
        // 身体微缩 + 半透明
        Animated.parallel([
          Animated.timing(emotionTranslateY, {
            toValue: 5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(emotionOpacity, {
            toValue: 0.7,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'dormant':
        // 几乎静止 + 半透明
        Animated.parallel([
          Animated.timing(emotionTranslateY, {
            toValue: 8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(emotionOpacity, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'excited': {
        // 左右摇晃
        emotionTranslateY.setValue(0);
        const shakeLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(shakeTranslateX, {
              toValue: -5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(shakeTranslateX, {
              toValue: 5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(shakeTranslateX, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ])
        );
        shakeLoopRef.current = shakeLoop;
        shakeLoop.start();
        break;
      }

      case 'anxious': {
        // 焦虑：轻微颤抖 + 不安
        Animated.parallel([
          Animated.timing(emotionTranslateY, {
            toValue: -3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(emotionOpacity, {
            toValue: 0.85,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        const anxiousShake = Animated.loop(
          Animated.sequence([
            Animated.timing(shakeTranslateX, { toValue: -2, duration: 150, useNativeDriver: true }),
            Animated.timing(shakeTranslateX, { toValue: 2, duration: 150, useNativeDriver: true }),
            Animated.timing(shakeTranslateX, { toValue: 0, duration: 150, useNativeDriver: true }),
          ])
        );
        shakeLoopRef.current = anxiousShake;
        anxiousShake.start();
        break;
      }

      default:
        // normal - 重置
        Animated.parallel([
          Animated.spring(emotionTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(emotionRotate, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(emotionOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
    }
  }, [emotionTranslateY, emotionRotate, emotionOpacity, shakeTranslateX]);

  // ========== 互动触发动画 ==========
  const playInteraction = useCallback((type: InteractionAnimation) => {
    if (!type) return;

    // 互动动画优先级最高：中断呼吸和情绪循环动画
    breathLoopRef.current?.stop();
    shakeLoopRef.current?.stop();

    const reset = { toValue: 1, duration: 300, useNativeDriver: true as const };
    const resetY = { toValue: 0, duration: 300, useNativeDriver: true as const };

    const restoreLoops = () => {
      // 互动结束后恢复呼吸和情绪动画
      startBreath(emotionRef.current);
      applyEmotion(emotionRef.current);
    };

    switch (type) {
      case 'pet':
        // 眯眼 + 后仰
        Animated.sequence([
          Animated.parallel([
            Animated.timing(interactionScale, { toValue: 0.95, duration: 300, useNativeDriver: true }),
            Animated.timing(interactionTranslateY, { toValue: -10, duration: 300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(interactionScale, reset),
            Animated.timing(interactionTranslateY, resetY),
          ]),
        ]).start(restoreLoops);
        break;

      case 'poke':
        // 抖动 + 歪头
        Animated.sequence([
          Animated.timing(interactionScale, { toValue: 1.08, duration: 80, useNativeDriver: true }),
          Animated.timing(interactionScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
          Animated.timing(interactionScale, { toValue: 1.04, duration: 80, useNativeDriver: true }),
          Animated.timing(interactionScale, reset),
        ]).start(restoreLoops);
        break;

      case 'hug':
        // 放大 + 上移
        Animated.sequence([
          Animated.parallel([
            Animated.spring(interactionScale, { toValue: 1.15, useNativeDriver: true, tension: 50, friction: 3 }),
            Animated.timing(interactionTranslateY, { toValue: -20, duration: 400, useNativeDriver: true }),
          ]),
          Animated.delay(800),
          Animated.parallel([
            Animated.timing(interactionScale, reset),
            Animated.timing(interactionTranslateY, resetY),
          ]),
        ]).start(restoreLoops);
        break;

      case 'kiss':
        // 前倾 + 爱心弹跳
        Animated.sequence([
          Animated.parallel([
            Animated.timing(interactionScale, { toValue: 1.08, duration: 250, useNativeDriver: true }),
            Animated.timing(interactionTranslateY, { toValue: -12, duration: 250, useNativeDriver: true }),
          ]),
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(interactionScale, reset),
            Animated.timing(interactionTranslateY, resetY),
          ]),
        ]).start(restoreLoops);
        break;

      case 'feed':
        // 张嘴 + 咀嚼跳跃
        Animated.sequence([
          Animated.timing(interactionScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(interactionTranslateY, { toValue: -15, duration: 200, useNativeDriver: true }),
          Animated.timing(interactionTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(interactionTranslateY, { toValue: -10, duration: 150, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(interactionScale, reset),
            Animated.timing(interactionTranslateY, resetY),
          ]),
        ]).start(restoreLoops);
        break;

      case 'double_tap':
        // 惊喜弹跳
        Animated.sequence([
          Animated.spring(interactionTranslateY, { toValue: -30, useNativeDriver: true, tension: 60, friction: 2 }),
          Animated.timing(interactionTranslateY, resetY),
        ]).start(restoreLoops);
        break;
    }
  }, [interactionScale, interactionTranslateY, startBreath, applyEmotion]);

  // ========== 生命周期 ==========
  // 情绪变化时重新启动呼吸 + 情绪动画
  useEffect(() => {
    emotionRef.current = emotion;
    startBreath(emotion);
    applyEmotion(emotion);
  }, [emotion, startBreath, applyEmotion]);

  // 互动触发
  useEffect(() => {
    if (interaction) {
      playInteraction(interaction);
    }
  }, [interaction, playInteraction]);

  // 启动眨眼
  useEffect(() => {
    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      const breathLoop = breathLoopRef.current;
      const shakeLoop = shakeLoopRef.current;
      breathLoop?.stop();
      shakeLoop?.stop();
    };
  }, [scheduleBlink]);

  return {
    breathScale,
    blinkScaleY,
    emotionTranslateY,
    emotionRotate,
    emotionOpacity,
    shakeTranslateX,
    interactionScale,
    interactionTranslateY,
  };
}

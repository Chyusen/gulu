/**
 * 咕噜 Gulu — 互动手势管理 Hook
 * 对应需求文档 5.1~5.5 宠物互动系统
 */

import { useRef, useCallback, useState } from 'react';
import {
  getTapFeedback,
  DOUBLE_TAP_SURPRISES,
  COOLDOWN_BUBBLE,
  INTERACTION_COOLDOWN,
  MAX_CONSECUTIVE_TAPS,
  FATIGUE_COOLDOWN,
  INTERACTION_MENU_ITEMS,
} from '../constants/interactions';
import type { InteractionAnimation } from './usePetAnimation';
import type { PetEmotion } from '../types';

export interface InteractionResult {
  animation: InteractionAnimation;
  bubble: string;
  sfx: string;
}

export function useInteraction(emotion: PetEmotion) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentInteraction, setCurrentInteraction] = useState<InteractionAnimation>(null);

  const lastInteractionTime = useRef(0);
  const consecutiveTaps = useRef(0);
  const lastTapTime = useRef(0);
  const fatiguedUntil = useRef(0);

  /** 短按处理 */
  const handleTap = useCallback((): InteractionResult | null => {
    const now = Date.now();

    // 检查是否疲惫中
    if (now < fatiguedUntil.current) {
      return { animation: null, bubble: COOLDOWN_BUBBLE, sfx: 'click' };
    }

    // 检查冷却
    if (now - lastInteractionTime.current < INTERACTION_COOLDOWN) {
      return { animation: null, bubble: COOLDOWN_BUBBLE, sfx: 'click' };
    }

    // 双击检测
    if (now - lastTapTime.current < 300) {
      // 双击惊喜
      lastTapTime.current = 0;
      consecutiveTaps.current = 0;
      lastInteractionTime.current = now;
      const surprise = DOUBLE_TAP_SURPRISES[Math.floor(Math.random() * DOUBLE_TAP_SURPRISES.length)];
      return { animation: 'double_tap', bubble: surprise, sfx: 'click' };
    }

    // 单击
    lastTapTime.current = now;
    consecutiveTaps.current++;

    // 检查连续点击上限
    if (consecutiveTaps.current >= MAX_CONSECUTIVE_TAPS) {
      fatiguedUntil.current = now + FATIGUE_COOLDOWN;
      consecutiveTaps.current = 0;
      return { animation: null, bubble: COOLDOWN_BUBBLE, sfx: 'click' };
    }

    lastInteractionTime.current = now;

    // 按情绪概率过滤
    // 休眠状态：30% 概率唤醒，70% 无反应
    if (emotion === 'dormant') {
      if (Math.random() > 0.3) {
        return { animation: null, bubble: '让我再睡一会儿...', sfx: 'click' };
      }
    }

    // 灰化状态：50% 概率给出治疗引导
    if (emotion === 'graying' && Math.random() < 0.5) {
      return { animation: 'pet', bubble: '你来了...能陪陪我吗？', sfx: 'heal' };
    }

    // 开心状态：80% 概率正面反馈
    if ((emotion === 'happy' || emotion === 'excited') && Math.random() > 0.8) {
      return { animation: 'pet', bubble: '嘿嘿~', sfx: 'pet' };
    }

    const feedback = getTapFeedback(emotion);
    return {
      animation: feedback.animation,
      bubble: feedback.bubble,
      sfx: feedback.sfx,
    };
  }, [emotion]);

  /** 长按处理 — 展开菜单 */
  const handleLongPress = useCallback(() => {
    setMenuVisible(true);
  }, []);

  /** 菜单选择 */
  const handleMenuSelect = useCallback((type: InteractionAnimation): InteractionResult | null => {
    setMenuVisible(false);

    const now = Date.now();
    if (now - lastInteractionTime.current < INTERACTION_COOLDOWN) {
      return null;
    }
    lastInteractionTime.current = now;

    // 从配置中获取随机气泡文案
    const config = INTERACTION_MENU_ITEMS.find((i) => i.type === type);
    if (!config) return null;

    const bubble = config.bubbles[Math.floor(Math.random() * config.bubbles.length)];
    return {
      animation: type,
      bubble,
      sfx: config.sfx,
    };
  }, []);

  /** 关闭菜单 */
  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  /** 触发互动动画 */
  const triggerInteraction = useCallback((type: InteractionAnimation) => {
    setCurrentInteraction(type);
    // 互动动画播放后重置
    setTimeout(() => setCurrentInteraction(null), 2500);
  }, []);

  return {
    menuVisible,
    currentInteraction,
    handleTap,
    handleLongPress,
    handleMenuSelect,
    closeMenu,
    triggerInteraction,
  };
}

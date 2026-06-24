/**
 * 咕噜 Gulu — 浮动气泡组件
 * 对应需求文档 4.1~4.5 浮动气泡系统
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../constants/theme';
import type { FloatingBubbleData } from '../stores/immersiveChatStore';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface FloatingBubbleProps {
  data: FloatingBubbleData;
  /** 堆叠索引（0=最新，1=次新...） */
  stackIndex: number;
  /** 是否暂停消失 */
  paused: boolean;
  /** 相对宠物中心的位置偏移 */
  positionOffset?: { x: number; y: number };
  /** 气泡消失回调 */
  onDismiss: (id: string) => void;
  /** 接受行动闭环 */
  onAcceptAction?: (id: string) => void;
  /** 拒绝行动闭环 */
  onRejectAction?: (id: string) => void;
}

const DISPLAY_DURATION = 6000;
const ACTION_DISPLAY_DURATION = 12000; // 含行动闭环的气泡延长显示
const FADE_DURATION = 1000;
const EXPEDITED_DISPLAY_DURATION = 1500; // 加速淡出的气泡缩短显示

export function FloatingBubble({
  data,
  stackIndex,
  paused,
  positionOffset,
  onDismiss,
  onAcceptAction,
  onRejectAction,
}: FloatingBubbleProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const driftYAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 入场动画
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 50,
        friction: 5,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  // 轻微晃动（持续进行）
  useEffect(() => {
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, { toValue: -3, duration: 800, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(swayAnim, { toValue: 3, duration: 800, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    sway.start();
    return () => sway.stop();
  }, [swayAnim]);

  // 停留 + 上浮淡出
  useEffect(() => {
    if (paused) return; // 暂停时不启动消失计时

    // 根据气泡类型决定显示时长
    let displayDuration = DISPLAY_DURATION;
    if (data._expediting) {
      displayDuration = EXPEDITED_DISPLAY_DURATION;
    } else if (data.hasAction && data.actionText && !data.actionCompleted && !data.actionRejected) {
      displayDuration = ACTION_DISPLAY_DURATION;
    }

    // 普通气泡晃动 3 秒后上浮淡出；行动闭环气泡保留到显示末期再上浮
    const floatDelay = data.hasAction ? displayDuration - FADE_DURATION : 3000;

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(driftYAnim, {
          toValue: -60,
          duration: FADE_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(() => onDismiss(data.id));
    }, floatDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [paused, opacityAnim, driftYAnim, data.id, data.hasAction, data.actionText, data.actionCompleted, data.actionRejected, data._expediting, onDismiss]);

  const isUser = data.role === 'user';
  const offset = positionOffset ?? { x: 0, y: 0 };

  // 旧气泡略微缩小，避免喧宾夺主
  const baseScale = Math.max(0.88, 1 - stackIndex * 0.06);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: offset.x },
            { translateY: offset.y },
            { translateX: swayAnim },
            { translateY: driftYAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: baseScale }] }}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.petBubble]}>
          <Text
            style={[styles.text, isUser ? styles.userText : styles.petText]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {data.content}
          </Text>

        {/* 行动闭环按钮 */}
        {data.hasAction && data.actionText && !data.actionCompleted && !data.actionRejected && (
          <View style={styles.actionContainer}>
            <Text style={styles.actionText}>{data.actionText}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => onAcceptAction?.(data.id)}
              >
                <Text style={styles.actionBtnText}>接受</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => onRejectAction?.(data.id)}
              >
                <Text style={styles.actionBtnText}>稍后</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 行动闭环已完成 */}
        {data.hasAction && data.actionCompleted && (
          <Text style={styles.completedText}>✓ 已接受</Text>
        )}
      </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: 260,
  },
  bubble: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  petBubble: {
    backgroundColor: theme.colors.surface,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
  },
  text: {
    fontSize: theme.fontSize.body,
    lineHeight: 20,
  },
  petText: {
    color: theme.colors.textPrimary,
  },
  userText: {
    color: theme.colors.textInverse,
  },
  actionContainer: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  actionText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: theme.colors.backgroundTertiary,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionBtnText: {
    color: theme.colors.textInverse,
    fontSize: 11,
    fontWeight: '600',
  },
  completedText: {
    fontSize: 11,
    color: theme.colors.success,
    marginTop: 2,
  },
});

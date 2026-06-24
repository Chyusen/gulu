/**
 * 咕噜 Gulu — 宠物长按互动轮盘
 * 对应需求文档 4.4 长按宠物
 * 选项：抚摸、戳一戳、拥抱、亲亲
 */

import React, { useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../constants/theme';

export type InteractionType = 'pet' | 'poke' | 'hug' | 'kiss';

interface PetInteractionWheelProps {
  visible: boolean;
  onSelect: (type: InteractionType) => void;
  onClose: () => void;
}

const OPTIONS: { type: InteractionType; icon: string; label: string; angle: number }[] = [
  { type: 'pet', icon: '🤚', label: '抚摸', angle: 270 },
  { type: 'poke', icon: '👆', label: '戳一戳', angle: 0 },
  { type: 'hug', icon: '🤗', label: '拥抱', angle: 90 },
  { type: 'kiss', icon: '💋', label: '亲亲', angle: 180 },
];

const RADIUS = 90;

export function PetInteractionWheel({ visible, onSelect, onClose }: PetInteractionWheelProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  return (
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <Animated.View
        style={[
          styles.wheel,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        pointerEvents="box-none"
      >
        {OPTIONS.map((option) => {
          const rad = (option.angle * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          return (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.option,
                { transform: [{ translateX: x }, { translateY: y }] },
              ]}
              onPress={() => onSelect(option.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  wheel: {
    width: RADIUS * 2 + 80,
    height: RADIUS * 2 + 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  option: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.backgroundTertiary}F2`,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...({
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    } as object),
  },
  optionIcon: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

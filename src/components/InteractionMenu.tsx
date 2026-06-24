/**
 * 咕噜 Gulu — 圆形互动菜单
 * 对应需求文档 5.3 长按圆形互动菜单
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Pressable } from 'react-native';
import { theme } from '../constants/theme';
import { INTERACTION_MENU_ITEMS } from '../constants/interactions';
import type { InteractionAnimation } from '../hooks/usePetAnimation';

interface InteractionMenuProps {
  visible: boolean;
  onSelect: (type: InteractionAnimation) => void;
  onClose: () => void;
}

/** 菜单项放射角度（上=拥抱, 左=抚摸, 右=戳一戳, 下=喂食） */
const ANGLES = [180, 0, -90, 90]; // 对应 INTERACTION_MENU_ITEMS: [pet, poke, hug, feed]
const RADIUS = 100;

export function InteractionMenu({ visible, onSelect, onClose }: InteractionMenuProps) {
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const itemScales = useRef(INTERACTION_MENU_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // 展开动画
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        ...INTERACTION_MENU_ITEMS.map((_, i) =>
          Animated.spring(itemScales[i], {
            toValue: 1,
            useNativeDriver: true,
            tension: 60,
            friction: 5,
            delay: i * 50,
          })
        ),
      ]).start();
    } else {
      // 收回动画
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        ...INTERACTION_MENU_ITEMS.map((_, i) =>
          Animated.timing(itemScales[i], {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        ),
      ]).start();
    }
  }, [visible, bgOpacity, menuOpacity, itemScales]);

  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (visible) setHasAnimated(true);
  }, [visible]);

  if (!visible && !hasAnimated) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: bgOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.menuContainer}>
        {INTERACTION_MENU_ITEMS.map((item, i) => {
          const angle = (ANGLES[i] * Math.PI) / 180;
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;

          return (
            <Animated.View
              key={item.type}
              style={[
                styles.menuItem,
                {
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    { scale: itemScales[i] },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => onSelect(item.type)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuContainer: {
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItem: {
    position: 'absolute',
  },
  menuButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  menuLabel: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
});

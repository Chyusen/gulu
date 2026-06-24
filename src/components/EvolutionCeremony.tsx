/**
 * 咕噜 Gulu — 进化仪式动画
 * 紫光闪烁 → 宠物形态变换 → 新形态浮现 → 完成回调
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { PetAvatar } from './PetAvatar';
import { theme } from '../constants/theme';
import type { PetStage, StyleType } from '../types';

interface EvolutionCeremonyProps {
  visible: boolean;
  fromStage: 1 | 2 | 3;
  toStage: 1 | 2 | 3;
  style: StyleType;
  onComplete: () => void;
}

const STAGE_MAP: Record<number, PetStage> = {
  1: 'baby',
  2: 'adult',
  3: 'divine',
};

const STAGE_NAMES: Record<number, string> = {
  1: '萌芽体',
  2: '成长体',
  3: '灵魂体',
};

export function EvolutionCeremony({
  visible,
  fromStage,
  toStage,
  style,
  onComplete,
}: EvolutionCeremonyProps) {
  const [phase, setPhase] = useState<'flash' | 'transform' | 'done'>('flash');
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const petScale = useRef(new Animated.Value(0.5)).current;
  const petOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setPhase('flash');
      flashOpacity.setValue(0);
      petScale.setValue(0.5);
      petOpacity.setValue(0);
      return;
    }

    setPhase('flash');
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase('transform');
      Animated.parallel([
        Animated.timing(petScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(petOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPhase('done');
        setTimeout(onComplete, 800);
      });
    });
  }, [visible, flashOpacity, petOpacity, petScale, onComplete]);

  const displayStage = phase === 'flash' ? STAGE_MAP[fromStage] : STAGE_MAP[toStage];

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        <Animated.View style={[styles.flashOverlay, { opacity: flashOpacity }]} />

        <Animated.View
          style={[
            styles.petWrapper,
            {
              opacity: petOpacity,
              transform: [{ scale: petScale }],
            },
          ]}
        >
          <PetAvatar stage={displayStage} style={style} state="normal" size={160} />
        </Animated.View>

        <Text style={styles.title}>
          {phase === 'done'
            ? `✨ 进化完成！`
            : `咕噜正在进化中…`}
        </Text>
        <Text style={styles.subtitle}>
          {STAGE_NAMES[fromStage]} → {STAGE_NAMES[toStage]}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  petWrapper: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.primaryLight,
  },
});

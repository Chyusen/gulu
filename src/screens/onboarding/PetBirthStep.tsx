/**
 * 咕噜 Gulu — 引导流程 Step 7: 灵魂降生 + 起名
 * 对应需求文档 3.9 Step 7：灵魂降生 + 起名
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { PetAvatar } from '../../components/PetAvatar';
import { theme } from '../../constants/theme';
import { MBTI_PET_TRAITS, MBTI_ZODIAC_MATRIX } from '../../constants/mbti';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useUserStore } from '../../stores/userStore';
import { usePetStore } from '../../stores/petStore';
import { profileService } from '../../services/profileService';
import { petService } from '../../services/petService';
import { validateNickname } from '../../utils/nicknameValidator';
import type { Pet, StyleType, MBTIType } from '../../types';

type Phase = 'black' | 'heartbeat' | 'flash' | 'reveal' | 'match' | 'naming';

export function PetBirthStep() {
  const setPet = usePetStore((s) => s.setPet);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const selectedStyle = useOnboardingStore((s) => s.selectedStyle);
  const customPrompt = useOnboardingStore((s) => s.customPrompt);
  const user = useUserStore((s) => s.user);

  const [phase, setPhase] = useState<Phase>('black');
  const [petName, setPetName] = useState('咕噜');
  const [isFinishing, setIsFinishing] = useState(false);

  const pulseScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashScaleX = useRef(new Animated.Value(0)).current;
  const petOpacity = useRef(new Animated.Value(0)).current;
  const petScale = useRef(new Animated.Value(0.8)).current;
  const jumpY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setPhase('heartbeat'), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== 'heartbeat') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.3, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    );
    pulse.start(({ finished }) => {
      if (finished) setPhase('flash');
    });
    return () => pulse.stop();
  }, [phase, pulseScale]);

  useEffect(() => {
    if (phase !== 'flash') return;
    flashOpacity.setValue(0);
    flashScaleX.setValue(0);
    Animated.parallel([
      Animated.timing(flashOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(flashScaleX, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setPhase('reveal');
      });
    });
  }, [phase, flashOpacity, flashScaleX]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    petOpacity.setValue(0);
    petScale.setValue(0.8);
    Animated.parallel([
      Animated.timing(petOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(petScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start(() => setPhase('match'));
  }, [phase, petOpacity, petScale]);

  const matchReason = React.useMemo(() => {
    if (!user?.mbti || !user?.zodiac) return null;
    return MBTI_ZODIAC_MATRIX[user.mbti as MBTIType][user.zodiac].matchReason;
  }, [user?.mbti, user?.zodiac]);

  useEffect(() => {
    if (phase !== 'match') return;
    const timer = setTimeout(() => setPhase('naming'), 2500);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleConfirm = useCallback(async () => {
    const finalName = petName.trim() || '咕噜';
    const validation = validateNickname(finalName);
    if (!validation.valid) {
      Alert.alert('这个昵称不太合适', validation.reason);
      return;
    }
    if (isFinishing) return;
    setIsFinishing(true);

    Animated.sequence([
      Animated.timing(jumpY, { toValue: -30, duration: 200, useNativeDriver: true }),
      Animated.timing(jumpY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const petStyle = selectedStyle ?? 'anime';
    try {
      const remotePet = await petService.generatePet({
        user_id: user?.id ?? '',
        style: petStyle,
        custom_description: customPrompt || undefined,
        name: finalName,
      });
      // 后端返回数据可能缺少部分前端字段，这里做补全
      const mbti = user?.mbti ?? 'INFP';
      const traits = MBTI_PET_TRAITS[mbti as MBTIType];
      const completePet: Pet = {
        id: remotePet.id ?? `pet-${Date.now()}`,
        userId: remotePet.userId ?? user?.id ?? `user-${Date.now()}`,
        name: remotePet.name ?? finalName,
        personalityType: remotePet.personalityType ?? traits?.personalityType ?? 'companion',
        currentStage: remotePet.currentStage ?? 'baby',
        stageNumber: remotePet.stageNumber ?? 1,
        energyLevel: remotePet.energyLevel ?? 80,
        maxEnergy: remotePet.maxEnergy ?? 100,
        stamina: remotePet.stamina ?? 100,
        maxStamina: remotePet.maxStamina ?? 100,
        intimacy: remotePet.intimacy ?? 0,
        maxIntimacy: remotePet.maxIntimacy ?? 300,
        totalEnergy: remotePet.totalEnergy ?? 0,
        maxTotalEnergy: remotePet.maxTotalEnergy ?? 500,
        preferredFoods: remotePet.preferredFoods ?? (user?.mbti && user?.zodiac
          ? MBTI_ZODIAC_MATRIX[user.mbti as MBTIType][user.zodiac].foodPreferences
          : ['star_fruit', 'dream_cake', 'star_soup']),
        lastInteractionAt: remotePet.lastInteractionAt ?? new Date().toISOString(),
        isGraying: remotePet.isGraying ?? false,
        grayingSeverity: remotePet.grayingSeverity ?? 0,
        isDormant: remotePet.isDormant ?? false,
        style: remotePet.style ?? petStyle,
        customDescription: remotePet.customDescription ?? customPrompt ?? undefined,
        voiceType: remotePet.voiceType ?? 'cute_child',
        voiceSpeed: remotePet.voiceSpeed ?? 1.0,
        currentEmotion: remotePet.currentEmotion ?? 'happy',
        imageUrl: remotePet.imageUrl,
        actionClosureCount: remotePet.actionClosureCount ?? 0,
        grayingExperienced: remotePet.grayingExperienced ?? false,
        grayingHealed: remotePet.grayingHealed ?? false,
        collectibles: remotePet.collectibles ?? [],
        lastInteraction: remotePet.lastInteraction ?? new Date().toISOString(),
        createdAt: remotePet.createdAt ?? new Date().toISOString(),
      };
      setPet(completePet);
    } catch (e) {
      console.warn('Remote pet generation failed, using local pet:', e);
      const mbti = user?.mbti ?? 'INFP';
      const fallbackStyle: StyleType = selectedStyle ?? 'anime';
      const traits = MBTI_PET_TRAITS[mbti as MBTIType];
      const fallback: Pet = {
        id: `pet-${Date.now()}`,
        userId: user?.id ?? `user-${Date.now()}`,
        name: finalName,
        personalityType: traits?.personalityType ?? 'companion',
        currentStage: 'baby',
        stageNumber: 1,
        energyLevel: 80,
        maxEnergy: 100,
        stamina: 100,
        maxStamina: 100,
        intimacy: 0,
        maxIntimacy: 300,
        totalEnergy: 0,
        maxTotalEnergy: 500,
        preferredFoods: user?.mbti && user?.zodiac
          ? MBTI_ZODIAC_MATRIX[user.mbti as MBTIType][user.zodiac].foodPreferences
          : ['star_fruit', 'dream_cake', 'star_soup'],
        lastInteractionAt: new Date().toISOString(),
        isGraying: false,
        grayingSeverity: 0,
        isDormant: false,
        style: fallbackStyle,
        customDescription: customPrompt || undefined,
        voiceType: 'cute_child',
        voiceSpeed: 1.0,
        currentEmotion: 'happy',
        actionClosureCount: 0,
        grayingExperienced: false,
        grayingHealed: false,
        collectibles: [],
        createdAt: new Date().toISOString(),
      };
      setPet(fallback);
    }

    try {
      if (user?.mbti && user?.zodiac) {
        await profileService.createProfile({
          mbti: user.mbti,
          zodiac: user.zodiac,
          nickname: user.nickname,
        });
      }
    } catch (e) {
      console.warn('Save profile failed:', e);
    }

    completeOnboarding();
  }, [completeOnboarding, customPrompt, isFinishing, jumpY, petName, selectedStyle, setPet, user]);

  if (phase === 'black') {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {phase === 'heartbeat' && (
        <View style={styles.centered}>
          <Animated.View
            style={[
              styles.pulse,
              { transform: [{ scale: pulseScale }], backgroundColor: theme.colors.primary },
            ]}
          />
        </View>
      )}

      {(phase === 'flash' || phase === 'reveal' || phase === 'match' || phase === 'naming') && (
        <View style={styles.centered}>
          <Animated.View
            style={[
              styles.flash,
              { opacity: flashOpacity, transform: [{ scaleX: flashScaleX }] },
            ]}
          />
          <Animated.View
            style={{
              opacity: petOpacity,
              transform: [{ scale: petScale }, { translateY: jumpY }],
            }}
          >
            <PetAvatar
              stage="baby"
              style={selectedStyle ?? 'anime'}
              state="normal"
              emotion="happy"
              size={200}
              animated
            />
          </Animated.View>

          {phase === 'match' && matchReason && (
            <View style={styles.matchBox}>
              <Text style={styles.matchTitle}>灵魂共鸣</Text>
              <Text style={styles.matchReason}>{matchReason}</Text>
            </View>
          )}

          {phase === 'naming' && (
            <View style={styles.nameBox}>
              <Text style={styles.greeting}>“喵呜……（伸懒腰）我闻到了你的味道，等你好久了。”</Text>
              <Text style={styles.label}>给我取个名字吧</Text>
              <TextInput
                style={styles.input}
                value={petName}
                onChangeText={setPetName}
                placeholder="咕噜"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
                autoFocus
              />
              <TouchableOpacity onPress={handleConfirm} disabled={isFinishing}>
                <Text style={[styles.confirmText, isFinishing && styles.confirmTextDisabled]}>
                  {isFinishing ? '降生中...' : '确认'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  pulse: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.full,
    opacity: 0.5,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
  },
  flash: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: theme.colors.textInverse,
  },
  nameBox: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  greeting: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  label: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  input: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  confirmText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  confirmTextDisabled: {
    color: theme.colors.textTertiary,
  },
  matchBox: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.xl,
  },
  matchTitle: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  matchReason: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

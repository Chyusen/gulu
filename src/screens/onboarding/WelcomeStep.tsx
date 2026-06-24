/**
 * 咕噜 Gulu — 引导流程 Step 0: 破冰邀请
 * 对应需求文档 3.2 Step 0：破冰邀请
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../constants/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useUserStore } from '../../stores/userStore';
import { validateNickname } from '../../utils/nicknameValidator';
import type { MBTIType, GenderType } from '../../types';

type Phase = 'invitation' | 'form';

const MBTI_PATTERN = /^[ie][sn][ft][jp]$/i;

export function WelcomeStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const clearMBTIAnswers = useOnboardingStore((s) => s.clearMBTIAnswers);
  const updateMBTI = useUserStore((s) => s.updateMBTI);
  const updateNickname = useUserStore((s) => s.updateNickname);
  const updateGender = useUserStore((s) => s.updateGender);
  const setUser = useUserStore((s) => s.setUser);
  const user = useUserStore((s) => s.user);

  const [phase, setPhase] = useState<Phase>('invitation');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<GenderType | null>(null);
  const [quickMbti, setQuickMbti] = useState('');
  const [mbtiError, setMbtiError] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.6)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, { toValue: 1.15, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 0.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [orbOpacity, orbScale, ringOpacity, ringScale, textOpacity]);

  const handleOrbPress = useCallback(() => {
    Animated.parallel([
      Animated.timing(orbScale, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      Animated.timing(ringScale, { toValue: 0.3, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => setPhase('form'));
    });
  }, [orbScale, ringScale, flashOpacity]);

  const handleNicknameSubmit = useCallback(() => {
    const final = nickname.trim();
    const validation = validateNickname(final);
    if (!validation.valid) {
      setNicknameError(validation.reason);
      return;
    }
    setNicknameError(null);
    if (!user) {
      setUser({
        id: `user_${Date.now()}`,
        nickname: final,
        privacyLevel: 1,
        isMinor: false,
        createdAt: new Date().toISOString(),
      });
    }
    updateNickname(final);
    if (gender) {
      updateGender(gender);
    }

    const mbti = quickMbti.trim();
    if (mbti.length > 0) {
      if (!MBTI_PATTERN.test(mbti)) {
        setMbtiError(true);
        return;
      }
      // 已填写有效 MBTI，直接跳过测试题进入星座选择
      setMbtiError(false);
      updateMBTI(mbti.toUpperCase() as MBTIType);
      clearMBTIAnswers();
      setStep('zodiac');
      return;
    }

    setMbtiError(false);
    setStep('energyField');
  }, [nickname, quickMbti, gender, user, setUser, updateNickname, updateGender, updateMBTI, clearMBTIAnswers, setStep]);

  const genderOptions: { value: GenderType; label: string }[] = [
    { value: 'male', label: '男生' },
    { value: 'female', label: '女生' },
    { value: 'undisclosed', label: '不愿透露' },
  ];

  const canContinue = nickname.trim().length > 0 && gender !== null;

  if (phase === 'invitation') {
    return (
      <View style={styles.container}>
        <Animated.Text style={[styles.inviteText, { opacity: textOpacity }]}>
          “在茫茫宇宙中，你的灵魂正发出特定的频率。让我听见你，好吗？”
        </Animated.Text>
        <TouchableOpacity activeOpacity={1} onPress={handleOrbPress} style={styles.orbTouchable}>
          <Animated.View
            style={[
              styles.ring,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              { transform: [{ scale: orbScale }], opacity: orbOpacity },
            ]}
          />
        </TouchableOpacity>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.textInverse, opacity: flashOpacity },
          ]}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.formContent}>
        <Text style={styles.formTitle}>告诉我你的名字</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="昵称（1-12 字符）"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={12}
          returnKeyType="next"
          onSubmitEditing={handleNicknameSubmit}
          autoFocus
        />
        {nicknameError && (
          <Text style={styles.errorText}>{nicknameError}</Text>
        )}

        <View style={styles.genderBox}>
          <Text style={styles.genderLabel}>选择你的性别</Text>
          <View style={styles.genderOptions}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  gender === option.value && styles.genderOptionSelected,
                ]}
                onPress={() => setGender(option.value)}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    gender === option.value && styles.genderOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.quickMbtiBox}>
          <Text style={styles.quickLabel}>✨ 如果已经知道自己的 MBTI，可以直接告诉咕噜，跳过测试更快降生～</Text>
          <TextInput
            style={styles.quickInput}
            value={quickMbti}
            onChangeText={(text) => {
              setQuickMbti(text);
              setMbtiError(false);
            }}
            placeholder="如INFJ"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={4}
            autoCapitalize="characters"
            returnKeyType="go"
            onSubmitEditing={handleNicknameSubmit}
          />
          {mbtiError && (
            <Text style={styles.errorText}>请输入有效的 MBTI 类型（如INFJ）</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          onPress={handleNicknameSubmit}
          disabled={!canContinue}
        >
          <Text style={styles.continueBtnText}>
            {MBTI_PATTERN.test(quickMbti.trim()) ? '跳过测试，直接降生' : '继续'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  inviteText: {
    fontSize: theme.fontSize.headline,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  orbTouchable: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  ring: {
    width: 160,
    height: 160,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
    position: 'absolute',
  },
  formContent: {
    width: '100%',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: theme.fontSize.largeTitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  input: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  genderBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  genderLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  genderOption: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  genderOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  genderOptionText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  genderOptionTextSelected: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  quickMbtiBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  quickLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  quickInput: {
    width: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    textAlign: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: theme.colors.surface,
  },
  continueBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
  },
});

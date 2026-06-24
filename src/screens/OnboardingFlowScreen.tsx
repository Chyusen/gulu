/**
 * 咕噜 Gulu — 7 步降生法引导流程容器
 * 对应需求文档 第三章
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingStore, type OnboardingStep } from '../stores/onboardingStore';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { EnergyFieldStep } from './onboarding/EnergyFieldStep';
import { CognitionPrismStep } from './onboarding/CognitionPrismStep';
import { WoundMirrorStep } from './onboarding/WoundMirrorStep';
import { FateCompassStep } from './onboarding/FateCompassStep';
import { ZodiacStep } from './onboarding/ZodiacStep';
import { PetCreateStep } from './onboarding/PetCreateStep';
import { PetBirthStep } from './onboarding/PetBirthStep';
import { Background } from '../components/Background';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingFlow'>;

export function OnboardingFlowScreen() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const navigation = useNavigation<NavProp>();

  useEffect(() => {
    if (currentStep === 'completed') {
      navigation.replace('Main');
    }
  }, [currentStep, navigation]);

  const renderStep = (step: OnboardingStep) => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep />;
      case 'energyField':
        return <EnergyFieldStep />;
      case 'cognitionPrism':
        return <CognitionPrismStep />;
      case 'woundMirror':
        return <WoundMirrorStep />;
      case 'fateCompass':
        return <FateCompassStep />;
      case 'zodiac':
        return <ZodiacStep />;
      case 'petCreate':
        return <PetCreateStep />;
      case 'petBirth':
        return <PetBirthStep />;
      case 'completed':
        return null;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <Background name="loading">
      <View style={styles.container}>{renderStep(currentStep)}</View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

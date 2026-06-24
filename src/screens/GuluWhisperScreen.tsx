/**
 * 咕噜 Gulu — 咕噜悄悄话
 * 对应需求文档 4.7 咕噜悄悄话
 * 展示宠物自主探索中与其他宠物交流的故事，体现性格差异
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Background } from '../components/Background';
import { PetAvatar } from '../components/PetAvatar';
import { theme } from '../constants/theme';
import { useExploreStore } from '../stores/exploreStore';
import { usePetStore } from '../stores/petStore';

export function GuluWhisperScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pet = usePetStore((s) => s.pet);
  const whispers = useExploreStore((s) => s.whispers);

  return (
    <Background name="home">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.headerEmoji}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>咕噜悄悄话</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {pet && (
            <View style={styles.petBox}>
              <PetAvatar stage={pet.currentStage} style={pet.style} state="normal" size={100} animated />
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petHint}>它在外出时遇到了这些故事～</Text>
            </View>
          )}

          {whispers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💤</Text>
              <Text style={styles.emptyTitle}>还没有悄悄话哦</Text>
              <Text style={styles.emptyHint}>派遣咕噜去自主探索，它会带回有趣的故事～</Text>
            </View>
          ) : (
            <View style={styles.whisperList}>
              {whispers.map((whisper) => (
                <View
                  key={whisper.id}
                  style={[
                    styles.whisperCard,
                    whisper.personalityTag === 'social' ? styles.socialCard : styles.soloCard,
                  ]}
                >
                  <Text style={styles.whisperEmoji}>
                    {whisper.personalityTag === 'social' ? '🐾' : '🍃'}
                  </Text>
                  <Text style={styles.whisperStory}>{whisper.story}</Text>
                  <Text style={styles.whisperTag}>
                    {whisper.personalityTag === 'social' ? '外向 · 社交' : '内向 · 独处'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerEmoji: {
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
  headerTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    padding: theme.spacing.lg,
  },
  petBox: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  petName: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  petHint: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  whisperList: {
    gap: theme.spacing.md,
  },
  whisperCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  socialCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.energyHigh,
  },
  soloCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },
  whisperEmoji: {
    fontSize: 24,
    marginBottom: theme.spacing.sm,
  },
  whisperStory: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    lineHeight: 24,
    marginBottom: theme.spacing.sm,
  },
  whisperTag: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
});

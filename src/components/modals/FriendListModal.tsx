/**
 * 咕噜 Gulu — 好友列表弹窗内容
 * 从 FriendListScreen 提取，适配半屏弹窗
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { theme } from '../../constants/theme';
import { PetAvatar } from '../PetAvatar';
import type { StyleType } from '../../types';

interface Friend {
  id: string;
  nickname: string;
  petName: string;
  petStage: 'baby' | 'adult' | 'divine';
  petStyle: StyleType;
  lastOnline: string;
  avatarUrl?: string;
}

const MOCK_FRIENDS: Friend[] = [
  {
    id: 'f1',
    nickname: '小星的主人',
    petName: '小星',
    petStage: 'adult',
    petStyle: 'anime',
    lastOnline: '10 分钟前',
  },
  {
    id: 'f2',
    nickname: '月儿酱',
    petName: '月儿',
    petStage: 'baby',
    petStyle: 'scifi',
    lastOnline: '2 小时前',
  },
];

export function FriendListModal() {
  const [friends] = useState<Friend[]>(MOCK_FRIENDS);

  const handleFriendPress = (friend: Friend) => {
    Alert.alert(
      `${friend.nickname}`,
      `咕噜：${friend.petName}\n最后在线：${friend.lastOnline}`,
      [
        { text: '删除好友', style: 'destructive', onPress: () => {} },
        { text: '举报', style: 'default', onPress: () => {} },
        { text: '关闭', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>我的好友</Text>
      <Text style={styles.subtitle}>和咕噜的朋友们保持联系～</Text>

      {friends.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🌌</Text>
          <Text style={styles.emptyText}>还没有好友哦</Text>
          <Text style={styles.emptyHint}>在探索界面发现附近的咕噜伙伴吧～</Text>
        </View>
      ) : (
        friends.map((friend) => (
          <TouchableOpacity
            key={friend.id}
            style={styles.friendCard}
            onPress={() => handleFriendPress(friend)}
            activeOpacity={0.8}
          >
            <View style={styles.petAvatarWrapper}>
              <PetAvatar
                stage={friend.petStage}
                style={friend.petStyle}
                state="normal"
                size={56}
              />
              <View style={styles.userAvatarBadge}>
                {friend.avatarUrl ? (
                  <Image source={{ uri: friend.avatarUrl }} style={styles.userAvatarImage} />
                ) : (
                  <Text style={styles.userAvatarEmoji}>🌙</Text>
                )}
              </View>
            </View>
            <View style={styles.info}>
              <Text style={styles.nickname}>{friend.nickname}</Text>
              <Text style={styles.petName}>
                咕噜：{friend.petName} · {friend.lastOnline}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  petAvatarWrapper: {
    position: 'relative',
  },
  userAvatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  userAvatarEmoji: {
    fontSize: 12,
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  nickname: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  petName: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: theme.colors.textTertiary,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
});

/**
 * 咕噜 Gulu — 历史记录滑出面板
 * 对应需求文档 4.4 历史记录查看
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { theme } from '../constants/theme';
import type { Message } from '../types';

interface ChatHistoryPanelProps {
  visible: boolean;
  messages: Message[];
  onClose: () => void;
  onAcceptAction?: (messageId: string) => void;
  onRejectAction?: (messageId: string) => void;
}

interface HistoryItemProps {
  message: Message;
  onAcceptAction?: (messageId: string) => void;
  onRejectAction?: (messageId: string) => void;
}

const HistoryItem = memo(({ message, onAcceptAction, onRejectAction }: HistoryItemProps) => {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.petRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.petBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.petText]}>
          {message.content}
        </Text>
        <Text style={styles.timeText}>
          {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {message.actionClosure && (
          <View style={styles.actionCard}>
            <Text style={styles.actionLabel}>
              行动建议 · {message.actionClosure.actionType}
            </Text>
            <Text style={styles.actionText}>{message.actionClosure.actionText}</Text>
            {message.actionClosure.isCompleted ? (
              <Text style={styles.completedText}>✓ 已接受</Text>
            ) : message.actionClosure.isRejected ? (
              <Text style={styles.rejectedText}>已跳过</Text>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => onAcceptAction?.(message.id)}
                >
                  <Text style={styles.actionBtnText}>接受</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => onRejectAction?.(message.id)}
                >
                  <Text style={styles.actionBtnText}>稍后</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

export function ChatHistoryPanel({
  visible,
  messages,
  onClose,
  onAcceptAction,
  onRejectAction,
}: ChatHistoryPanelProps) {
  const renderItem = ({ item }: { item: Message }) => (
    <HistoryItem
      message={item}
      onAcceptAction={onAcceptAction}
      onRejectAction={onRejectAction}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>对话历史</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>还没有对话记录</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '85%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textTertiary,
  },
  messageRow: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  petRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.spacing.xs,
  },
  petBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.fontSize.body,
    lineHeight: 22,
  },
  userText: {
    color: theme.colors.textInverse,
  },
  petText: {
    color: theme.colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-end',
  },
  actionCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  actionLabel: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  actionText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: theme.colors.backgroundTertiary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },
  completedText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.success,
    fontWeight: '600',
  },
  rejectedText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
  },
});

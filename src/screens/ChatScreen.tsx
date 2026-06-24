/**
 * 咕噜 Gulu — 对话界面
 * 对应需求文档 5.1 聊天界面 / 5.2 AI 对话 / 5.3 行动闭环
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import { useChatStore } from '../stores/chatStore';
import { usePetStore } from '../stores/petStore';
import { useUserStore } from '../stores/userStore';
import { chatService } from '../services/chatService';
import { voiceService } from '../services/voiceService';
import { useSettingsStore } from '../stores/settingsStore';
import { AssetManager } from '../utils/AssetManager';
import type { Message, ChatResponse } from '../types';

export function ChatScreen() {
  const pet = usePetStore((s) => s.pet);
  const user = useUserStore((s) => s.user);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const isTyping = useChatStore((s) => s.isTyping);
  const setTyping = useChatStore((s) => s.setTyping);
  const getRecentContext = useChatStore((s) => s.getRecentContext);
  const completeActionClosure = useChatStore((s) => s.completeActionClosure);
  const rejectActionClosure = useChatStore((s) => s.rejectActionClosure);
  const incrementActionClosure = usePetStore((s) => s.incrementActionClosure);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceType = useSettingsStore((s) => s.voiceType);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    // 滚动到底部
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  if (!pet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>还没有宠物</Text>
      </View>
    );
  }

  /** 敏感词检测（自伤/自杀） */
  const detectSensitiveContent = (text: string): boolean => {
    const sensitiveWords = ['自杀', '自伤', '自残', '不想活', '想死', '结束生命'];
    return sensitiveWords.some((w) => text.includes(w));
  };

  /** 安全回复 */
  const getSafetyReply = (): Message => {
    return {
      id: `msg_${Date.now()}`,
      userId: user?.id ?? '',
      petId: pet.id,
      role: 'assistant',
      content:
        '我感受到你现在很痛苦，你的感受是真实而重要的。请记住，你并不孤单。\n\n如果你正在经历危机，请立即联系：\n• 全国心理援助热线：400-161-9995\n• 北京心理危机研究与干预中心：010-82951332\n\n专业的帮助可以陪你度过这个艰难时刻。我永远在这里陪着你。',
      emotionTag: 'sad',
      isActionCompleted: false,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const text = inputText.trim();
    setInputText('');

    // 添加用户消息
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      userId: user?.id ?? '',
      petId: pet.id,
      role: 'user',
      content: text,
      isActionCompleted: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    // 敏感词检测
    if (detectSensitiveContent(text)) {
      addMessage(getSafetyReply());
      return;
    }

    setTyping(true);

    try {
      // 调用后端 AI 对话服务
      getRecentContext();
      const response: ChatResponse = await chatService.sendMessage({
        user_id: user?.id ?? '',
        pet_id: pet.id,
        message: text,
        context_length: 10,
      });

      const aiMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        userId: user?.id ?? '',
        petId: pet.id,
        role: 'assistant',
        content: response.reply,
        emotionTag: response.emotionTag,
        actionClosure: response.actionClosure
          ? {
              id: `action_${Date.now()}`,
              userId: user?.id ?? '',
              petId: pet.id,
              actionText: response.actionClosure.actionText,
              actionType: response.actionClosure.actionType,
              isCompleted: false,
              createdAt: new Date().toISOString(),
            }
          : undefined,
        isActionCompleted: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(aiMessage);

      // 语音播放
      if (voiceEnabled) {
        voiceService.setVoice(voiceType);
        voiceService.speak(response.reply);
      }

      // 播放消息音效
      const sound = await AssetManager.loadSound('message');
      if (sound) {
        await sound.replayAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      const err = e as Error;
      // 离线/失败时显示友好提示
      const fallbackMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        userId: user?.id ?? '',
        petId: pet.id,
        role: 'assistant',
        content: `我好像有点走神了... ${err.message}`,
        emotionTag: 'neutral',
        isActionCompleted: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(fallbackMessage);
    } finally {
      setTyping(false);
    }
  };

  const handleActionAccept = (messageId: string) => {
    completeActionClosure(messageId);
    incrementActionClosure();
    Alert.alert(
      '行动闭环',
      '已接受行动建议！完成后回来告诉咕噜哦～\n\n完成行动闭环可以：\n• 解锁灵魂盛宴喂食\n• 推动宠物进化\n• 收集独特元素',
    );
  };

  const handleActionReject = (messageId: string) => {
    rejectActionClosure(messageId);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.petRow]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.petBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser ? styles.userText : styles.petText]}>
            {item.content}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>

          {/* 行动闭环卡片 */}
          {item.actionClosure && (
            <View style={styles.actionCard}>
              <Text style={styles.actionLabel}>
                行动建议 · {item.actionClosure.actionType === 'physical' ? '身体' :
                  item.actionClosure.actionType === 'social' ? '社交' :
                  item.actionClosure.actionType === 'creative' ? '创造' : '反思'}
              </Text>
              <Text style={styles.actionText}>{item.actionClosure.actionText}</Text>
              {item.actionClosure.isCompleted ? (
                <View style={styles.actionCompletedTag}>
                  <Text style={styles.actionCompletedText}>✓ 已接受</Text>
                </View>
              ) : item.actionClosure.isRejected ? (
                <View style={styles.actionRejectedTag}>
                  <Text style={styles.actionRejectedText}>已跳过</Text>
                </View>
              ) : (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnAccept]}
                    onPress={() => handleActionAccept(item.id)}
                  >
                    <Text style={styles.actionBtnText}>接受</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnReject]}
                    onPress={() => handleActionReject(item.id)}
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              和 {pet.name} 说点什么吧～{'\n'}咕噜会一直在这里倾听你
            </Text>
          </View>
        }
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{pet.name} 正在输入...</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={`和 ${pet.name} 说点什么...`}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isTyping}
        >
          <Text style={styles.sendText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyChatText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
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
  actionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionBtnAccept: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnReject: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  actionBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },
  actionCompletedTag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  actionCompletedText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
  },
  actionRejectedTag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.backgroundTertiary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  actionRejectedText: {
    color: theme.colors.textTertiary,
    fontSize: theme.fontSize.caption,
  },
  typingIndicator: {
    padding: theme.spacing.md,
  },
  typingText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
});

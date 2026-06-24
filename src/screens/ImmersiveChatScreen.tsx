/**
 * 咕噜 Gulu — 沉浸式对话界面
 * 对应需求文档 沉浸式对话改造_需求文档
 * Replika 风格全屏沉浸式对话体验
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';
import { usePetStore } from '../stores/petStore';
import { useChatStore } from '../stores/chatStore';
import { useUserStore } from '../stores/userStore';
import { useImmersiveChatStore, type FloatingBubbleData } from '../stores/immersiveChatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { chatService } from '../services/chatService';
import { voiceService } from '../services/voiceService';
import { AssetManager } from '../utils/AssetManager';
import { PetAvatar } from '../components/PetAvatar';
import { FloatingBubble } from '../components/FloatingBubble';
import { InteractionMenu } from '../components/InteractionMenu';
import { ChatHistoryPanel } from '../components/ChatHistoryPanel';
import { CollapsibleInput } from '../components/CollapsibleInput';
import { useInteraction } from '../hooks/useInteraction';
import type { InteractionAnimation } from '../hooks/usePetAnimation';
import type { Message, ChatResponse, PetState } from '../types';

export function ImmersiveChatScreen() {
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
  const updateEnergy = usePetStore((s) => s.updateEnergy);
  const setEmotion = usePetStore((s) => s.setEmotion);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceType = useSettingsStore((s) => s.voiceType);

  const visibleBubbles = useImmersiveChatStore((s) => s.visibleBubbles);
  const addBubble = useImmersiveChatStore((s) => s.addBubble);
  const removeBubble = useImmersiveChatStore((s) => s.removeBubble);
  const inputExpanded = useImmersiveChatStore((s) => s.inputExpanded);
  const setInputExpanded = useImmersiveChatStore((s) => s.setInputExpanded);
  const historyPanelOpen = useImmersiveChatStore((s) => s.historyPanelOpen);
  const setHistoryPanelOpen = useImmersiveChatStore((s) => s.setHistoryPanelOpen);

  const [inputText, setInputText] = useState('');
  const [petInteraction, setPetInteraction] = useState<InteractionAnimation>(null);
  const petScaleAnim = useRef(new Animated.Value(1)).current;
  const petTranslateYAnim = useRef(new Animated.Value(0)).current;

  const interaction = useInteraction(pet?.currentEmotion ?? 'normal');

  // 宠物缩放 + 上移动画（输入框展开时缩小并上移）
  useEffect(() => {
    Animated.parallel([
      Animated.spring(petScaleAnim, {
        toValue: inputExpanded ? 0.7 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(petTranslateYAnim, {
        toValue: inputExpanded ? -50 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [inputExpanded, petScaleAnim, petTranslateYAnim]);

  // 清理过期气泡
  const handleBubbleDismiss = useCallback((id: string) => {
    removeBubble(id);
  }, [removeBubble]);

  // 添加浮动气泡
  const showBubble = useCallback((
    content: string,
    role: 'user' | 'assistant',
    hasAction?: boolean,
    actionText?: string,
    messageId?: string,
  ) => {
    const bubble: FloatingBubbleData = {
      id: `bubble_${Date.now()}_${Math.random()}`,
      content,
      role,
      createdAt: new Date().toISOString(),
      hasAction,
      actionText,
      messageId,
    };
    addBubble(bubble);
  }, [addBubble]);

  // 敏感词检测
  const detectSensitiveContent = (text: string): boolean => {
    const sensitiveWords = ['自杀', '自伤', '自残', '不想活', '想死', '结束生命'];
    return sensitiveWords.some((w) => text.includes(w));
  };

  // 安全回复
  const getSafetyReply = (): Message => {
    return {
      id: `msg_${Date.now()}`,
      userId: user?.id ?? '',
      petId: pet?.id ?? '',
      role: 'assistant',
      content: '我感受到你现在很痛苦。你并不孤单。\n全国心理援助热线：400-161-9995',
      emotionTag: 'sad',
      isActionCompleted: false,
      createdAt: new Date().toISOString(),
    };
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputText.trim() || isTyping || !pet) return;

    const text = inputText.trim();
    setInputText('');

    // 添加用户消息到 store
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

    // 显示用户气泡
    showBubble(text, 'user');

    // 收起输入框
    setInputExpanded(false);

    // 敏感词检测
    if (detectSensitiveContent(text)) {
      const safetyMsg = getSafetyReply();
      addMessage(safetyMsg);
      showBubble(safetyMsg.content, 'assistant');
      setEmotion('sad');
      return;
    }

    setTyping(true);
    // 思考动画：AI 正在处理
    setEmotion('normal');

    try {
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

      // 显示 AI 气泡（传入 messageId 用于行动闭环关联）
      showBubble(
        response.reply,
        'assistant',
        !!response.actionClosure,
        response.actionClosure?.actionText,
        aiMessage.id,
      );

      // 根据情绪标签更新宠物情绪
      if (response.emotionTag === 'happy' || response.emotionTag === 'excited') {
        setEmotion('happy');
      } else if (response.emotionTag === 'sad') {
        setEmotion('sad');
      }

      // 语音播放
      if (voiceEnabled) {
        voiceService.setVoice(voiceType);
        voiceService.speak(response.reply);
      }

      // 消息音效
      const sound = await AssetManager.loadSound('message');
      if (sound) {
        await sound.replayAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      const err = e as Error;
      const fallbackContent = `我好像有点走神了... ${err.message}`;
      const fallbackMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        userId: user?.id ?? '',
        petId: pet.id,
        role: 'assistant',
        content: fallbackContent,
        emotionTag: 'neutral',
        isActionCompleted: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(fallbackMessage);
      showBubble(fallbackContent, 'assistant');
    } finally {
      setTyping(false);
    }
  };

  // 宠物点击处理
  const handlePetTap = useCallback(async () => {
    if (!pet) return;
    const result = interaction.handleTap();
    if (!result) return;

    // 触发动画
    if (result.animation) {
      setPetInteraction(result.animation);
      interaction.triggerInteraction(result.animation);
      setTimeout(() => setPetInteraction(null), 2500);
    }

    // 显示气泡
    if (result.bubble) {
      showBubble(result.bubble, 'assistant');
    }

    // 播放音效
    if (result.sfx) {
      const sound = await AssetManager.loadSound(result.sfx);
      if (sound) {
        await sound.replayAsync();
        await sound.unloadAsync();
      }
    }

    // 能量加成
    if (result.animation === 'pet') {
      updateEnergy(2);
    }
  }, [pet, interaction, showBubble, updateEnergy]);

  // 宠物长按处理
  const handlePetLongPress = useCallback(() => {
    interaction.handleLongPress();
  }, [interaction]);

  // 菜单选择处理
  const handleMenuSelect = useCallback(async (type: InteractionAnimation) => {
    if (!pet) return;
    const result = interaction.handleMenuSelect(type);
    if (!result) return;

    // 触发动画
    setPetInteraction(type);
    interaction.triggerInteraction(type);
    setTimeout(() => setPetInteraction(null), 2500);

    // 显示气泡
    if (result.bubble) {
      showBubble(result.bubble, 'assistant');
    }

    // 播放音效
    if (result.sfx) {
      const sound = await AssetManager.loadSound(result.sfx);
      if (sound) {
        await sound.replayAsync();
        await sound.unloadAsync();
      }
    }

    // 能量加成
    const energyMap: Record<string, number> = {
      pet: 2,
      hug: 5,
      feed: 20,
      poke: 0,
    };
    const energyGain = type ? energyMap[type] : 0;
    if (energyGain) {
      updateEnergy(energyGain);
    }

    // 喂食时设为开心
    if (type === 'feed' || type === 'hug') {
      setEmotion('happy');
    }
  }, [pet, interaction, showBubble, updateEnergy, setEmotion]);

  // 行动闭环处理（通过 bubble 关联的 messageId 精确匹配）
  const handleAcceptAction = useCallback((bubbleId: string) => {
    const bubbles = useImmersiveChatStore.getState().visibleBubbles;
    const bubble = bubbles.find((b) => b.id === bubbleId);
    const messageId = bubble?.messageId;
    useImmersiveChatStore.getState().updateBubbleAction(bubbleId, true, false);
    if (messageId) {
      completeActionClosure(messageId);
      incrementActionClosure();
    }
    Alert.alert('行动闭环', '已接受行动建议！完成后回来告诉咕噜哦~');
  }, [completeActionClosure, incrementActionClosure]);

  const handleRejectAction = useCallback((bubbleId: string) => {
    const bubbles = useImmersiveChatStore.getState().visibleBubbles;
    const bubble = bubbles.find((b) => b.id === bubbleId);
    const messageId = bubble?.messageId;
    useImmersiveChatStore.getState().updateBubbleAction(bubbleId, false, true);
    if (messageId) {
      rejectActionClosure(messageId);
    }
  }, [rejectActionClosure]);

  // 历史面板中的行动闭环处理
  const handleHistoryAcceptAction = useCallback((messageId: string) => {
    completeActionClosure(messageId);
    incrementActionClosure();
  }, [completeActionClosure, incrementActionClosure]);

  const handleHistoryRejectAction = useCallback((messageId: string) => {
    rejectActionClosure(messageId);
  }, [rejectActionClosure]);

  if (!pet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>还没有宠物</Text>
      </View>
    );
  }

  // 获取宠物状态（完整映射情绪到视觉状态）
  const petState: PetState = pet.isDormant
    ? 'dormant'
    : pet.isGraying
    ? 'graying'
    : pet.currentEmotion === 'happy' || pet.currentEmotion === 'excited'
    ? 'happy'
    : pet.currentEmotion === 'sad'
    ? 'sad'
    : 'normal';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 全屏背景 */}
      <View style={styles.backgroundLayer} />

      {/* 浮动气泡区 */}
      <View style={styles.bubbleZone} pointerEvents="none">
        {visibleBubbles.map((bubble, index) => (
          <FloatingBubble
            key={bubble.id}
            data={bubble}
            stackIndex={visibleBubbles.length - 1 - index}
            paused={false}
            onDismiss={handleBubbleDismiss}
            onAcceptAction={handleAcceptAction}
            onRejectAction={handleRejectAction}
          />
        ))}
      </View>

      {/* 宠物展示区 */}
      <View style={styles.petZone}>
        <Animated.View style={{ transform: [{ scale: petScaleAnim }, { translateY: petTranslateYAnim }] }}>
          <Pressable
            onPress={handlePetTap}
            onLongPress={handlePetLongPress}
            delayLongPress={500}
          >
            <PetAvatar
              stage={pet.currentStage}
              style={pet.style}
              state={petState}
              emotion={pet.currentEmotion}
              size={inputExpanded ? 180 : 260}
              grayingSeverity={pet.grayingSeverity}
              animated
              interaction={petInteraction}
            />
          </Pressable>
        </Animated.View>

        {/* 打字指示器（思考动画） */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{pet.name} 正在思考...</Text>
          </View>
        )}

        {/* 宠物名字 */}
        {!inputExpanded && !isTyping && (
          <Text style={styles.petName}>{pet.name}</Text>
        )}
      </View>

      {/* 底部操作区 */}
      <View style={styles.bottomZone}>
        {/* 快捷操作栏 */}
        {!inputExpanded && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setHistoryPanelOpen(true)}
            >
              <Text style={styles.actionIcon}>📜</Text>
              <Text style={styles.actionLabel}>历史</Text>
            </TouchableOpacity>

            <CollapsibleInput
              expanded={false}
              value={inputText}
              onChangeText={setInputText}
              onSend={handleSend}
              onExpand={() => setInputExpanded(true)}
              onCollapse={() => setInputExpanded(false)}
              placeholder={`和 ${pet.name} 说点什么...`}
              disabled={isTyping}
            />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                // 设置入口 - 暂时用 Alert
                Alert.alert('设置', '设置功能开发中');
              }}
            >
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionLabel}>设置</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 展开的输入框 */}
        {inputExpanded && (
          <CollapsibleInput
            expanded
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onExpand={() => setInputExpanded(true)}
            onCollapse={() => setInputExpanded(false)}
            placeholder={`和 ${pet.name} 说点什么...`}
            disabled={isTyping}
          />
        )}
      </View>

      {/* 圆形互动菜单 */}
      <InteractionMenu
        visible={interaction.menuVisible}
        onSelect={handleMenuSelect}
        onClose={interaction.closeMenu}
      />

      {/* 历史记录面板 */}
      <ChatHistoryPanel
        visible={historyPanelOpen}
        messages={messages}
        onClose={() => setHistoryPanelOpen(false)}
        onAcceptAction={handleHistoryAcceptAction}
        onRejectAction={handleHistoryRejectAction}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.gradientStart,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  bubbleZone: {
    position: 'absolute',
    top: '8%',
    left: 0,
    right: 0,
    height: '45%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  petZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  petName: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  typingIndicator: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  typingText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  bottomZone: {
    paddingBottom: theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  actionLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});

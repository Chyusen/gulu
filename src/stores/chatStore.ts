/**
 * 咕噜 Gulu — 对话 Store
 * 管理聊天消息与对话上下文
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from '../types';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setTyping: (isTyping: boolean) => void;
  clearMessages: () => void;
  /** 获取最近10轮上下文 */
  getRecentContext: () => Message[];
  /** 标记行动闭环完成 */
  completeActionClosure: (messageId: string) => void;
  /** 标记行动闭环拒绝 */
  rejectActionClosure: (messageId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isTyping: false,
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      setTyping: (isTyping) => set({ isTyping }),
      clearMessages: () => set({ messages: [] }),
      getRecentContext: () => {
        const all = get().messages;
        // 最近10轮 = 20条消息
        return all.slice(-20);
      },
      completeActionClosure: (messageId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId && m.actionClosure
              ? {
                  ...m,
                  actionClosure: { ...m.actionClosure, isCompleted: true, completedAt: new Date().toISOString() },
                  isActionCompleted: true,
                }
              : m
          ),
        })),
      rejectActionClosure: (messageId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId && m.actionClosure
              ? {
                  ...m,
                  actionClosure: { ...m.actionClosure, isRejected: true },
                }
              : m
          ),
        })),
    }),
    {
      name: 'gulu-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

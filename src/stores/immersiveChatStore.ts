/**
 * 咕噜 Gulu — 沉浸式对话状态管理
 * 管理浮动气泡、输入框收起/展开、历史面板
 */

import { create } from 'zustand';

export interface FloatingBubbleData {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  /** 是否含行动闭环 */
  hasAction?: boolean;
  actionText?: string;
  actionCompleted?: boolean;
  actionRejected?: boolean;
  /** 关联的消息 ID（用于行动闭环精确匹配） */
  messageId?: string;
  /** 内部标记：是否加速淡出 */
  _expediting?: boolean;
}

interface ImmersiveChatState {
  /** 当前可见的浮动气泡（最多3条） */
  visibleBubbles: FloatingBubbleData[];
  /** 输入框是否展开 */
  inputExpanded: boolean;
  /** 历史面板是否打开 */
  historyPanelOpen: boolean;
  /** 气泡是否暂停消失（输入框展开时） */
  bubblePaused: boolean;

  /** 添加气泡（自动管理最多3条） */
  addBubble: (bubble: FloatingBubbleData) => void;
  /** 移除指定气泡 */
  removeBubble: (id: string) => void;
  /** 清空可见气泡 */
  clearVisibleBubbles: () => void;
  /** 展开/收起输入框 */
  setInputExpanded: (expanded: boolean) => void;
  /** 打开/关闭历史面板 */
  setHistoryPanelOpen: (open: boolean) => void;
  /** 更新行动闭环状态 */
  updateBubbleAction: (id: string, completed: boolean, rejected: boolean) => void;
}

export const useImmersiveChatStore = create<ImmersiveChatState>((set) => ({
  visibleBubbles: [],
  inputExpanded: false,
  historyPanelOpen: false,
  bubblePaused: false,

  addBubble: (bubble) =>
    set((state) => {
      const newBubbles = [...state.visibleBubbles, bubble];
      // 最多保留3条，超出时标记最早气泡为加速淡出
      if (newBubbles.length > 3) {
        const oldest = newBubbles[0];
        // 标记最早气泡为加速淡出（FloatingBubble 会检测此标记缩短显示时间）
        const markedOldest = { ...oldest, _expediting: true };
        return { visibleBubbles: [markedOldest, ...newBubbles.slice(1)] };
      }
      return { visibleBubbles: newBubbles };
    }),

  removeBubble: (id) =>
    set((state) => ({
      visibleBubbles: state.visibleBubbles.filter((b) => b.id !== id),
    })),

  clearVisibleBubbles: () => set({ visibleBubbles: [] }),

  setInputExpanded: (expanded) =>
    set({ inputExpanded: expanded, bubblePaused: expanded }),

  setHistoryPanelOpen: (open) => set({ historyPanelOpen: open }),

  updateBubbleAction: (id, completed, rejected) =>
    set((state) => ({
      visibleBubbles: state.visibleBubbles.map((b) =>
        b.id === id
          ? { ...b, actionCompleted: completed, actionRejected: rejected }
          : b
      ),
    })),
}));

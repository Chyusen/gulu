/**
 * 咕噜 Gulu — 对话服务
 * 对接后端 /api/v1/chat 接口
 * 对应需求文档 5.2 AI 对话
 */

import { apiClient } from './api';
import type { Message, ChatResponse } from '../types';

interface SendMessageRequest {
  user_id: string;
  pet_id: string;
  message: string;
  context_length?: number;
}

interface ChatHistoryResponse {
  messages: Message[];
}

export const chatService = {
  /** 发送消息并获取 AI 回复 */
  async sendMessage(data: SendMessageRequest): Promise<ChatResponse> {
    return apiClient.post('/chat', {
      ...data,
      context_length: data.context_length ?? 10,
    });
  },

  /** 获取对话历史 */
  async getHistory(userId: string, petId: string, limit: number = 50): Promise<Message[]> {
    const res: ChatHistoryResponse = await apiClient.get('/chat/history', {
      params: { user_id: userId, pet_id: petId, limit },
    });
    return res.messages;
  },
};

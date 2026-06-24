/**
 * 咕噜 Gulu — 宠物自主行为系统
 * 对应需求文档 六、宠物自主系统
 * - 离线行为（用户离开期间）
 * - 在线主动行为（用户在线时偶尔主动）
 * - 探险礼物
 */

import { usePetStore } from '../stores/petStore';
import { useChatStore } from '../stores/chatStore';
import type { Message, ExplorationGift } from '../types';

/** 探险礼物池（文本类：金句/好店推荐/治愈小诗，与 MBTI 画像匹配） */
const EXPLORATION_GIFTS: { type: 'quote' | 'recommendation' | 'poem'; content: string; mbtiMatch?: string }[] = [
  { type: 'quote', content: '每一个不曾起舞的日子，都是对生命的辜负。', mbtiMatch: 'INFP' },
  { type: 'quote', content: '星光不问赶路人，时光不负有心人。', mbtiMatch: 'INFJ' },
  { type: 'quote', content: '保持好奇，世界比你想象的更大。', mbtiMatch: 'ENTP' },
  { type: 'quote', content: '温柔的人有福了，因为他们必承受地土。', mbtiMatch: 'ISFJ' },
  { type: 'recommendation', content: '我发现了一家很温馨的咖啡馆，下次带你去！' },
  { type: 'recommendation', content: '附近有个小公园，阳光特别好，适合发呆～' },
  { type: 'recommendation', content: '路过一家书店，橱窗里的猫好可爱！' },
  { type: 'poem', content: '风轻轻吹过树梢，\n阳光洒在你的肩上，\n这一刻，世界很安静。' },
  { type: 'poem', content: '云朵慢慢飘过，\n像棉花糖一样柔软，\n今天的天气真好。' },
  { type: 'poem', content: '夜空中的星星，\n每一颗都在说晚安，\n你也该休息了。' },
];

/** 离线行为消息池 */
const OFFLINE_MESSAGES = [
  '你不在的时候，我数了 3 朵云～',
  '刚才有只蝴蝶停在我头上，好温柔～',
  '我学会了一个新表情，你看！',
  '我梦见了一片开满花的草地...',
  '今天的风好舒服，我想到了你。',
  '我帮你看着窗外，世界很安静。',
];

/** 在线主动行为消息池 */
const PROACTIVE_MESSAGES = [
  '嘿，你今天过得怎么样？',
  '我刚才想到一个有趣的事情...',
  '要不要一起深呼吸一下？',
  '你看起来有点累，要不要休息一下？',
  '我想听你说说话～',
  '今天有什么想分享的吗？',
];

/** 随机选一个元素 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成离线期间的宠物行为
 * 在用户重新打开 App 时调用
 */
export function generateOfflineBehavior(
  offlineHours: number
): {
  message: string;
  gift?: ExplorationGift;
} {
  const result: { message: string; gift?: ExplorationGift } = {
    message: pickRandom(OFFLINE_MESSAGES),
  };

  // 离线超过 2 小时有 30% 概率获得礼物
  if (offlineHours >= 2 && Math.random() < 0.3) {
    const giftData = pickRandom(EXPLORATION_GIFTS);
    result.gift = {
      type: giftData.type,
      content: giftData.content,
    };
  }

  return result;
}

/**
 * 添加离线行为消息到聊天记录
 */
export function appendOfflineMessage(
  petId: string,
  userId: string,
  behavior: { message: string; gift?: ExplorationGift }
) {
  const { addMessage } = useChatStore.getState();
  const { addCollectible } = usePetStore.getState();

  let content = behavior.message;
  if (behavior.gift) {
    const giftLabel = behavior.gift.type === 'quote' ? '金句' :
      behavior.gift.type === 'recommendation' ? '好店推荐' : '治愈小诗';
    content += `\n\n🎁 我带回来一个${giftLabel}：\n${behavior.gift.content}`;
    addCollectible(behavior.gift.content);
  }

  const message: Message = {
    id: `msg_offline_${Date.now()}`,
    userId,
    petId,
    role: 'assistant',
    content,
    emotionTag: 'happy',
    isActionCompleted: false,
    createdAt: new Date().toISOString(),
  };
  addMessage(message);
}

/**
 * 在线主动行为触发器
 * 在 App 中定时调用（如每 30 分钟）
 */
export class ProactiveBehaviorScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private petId: string;
  private userId: string;

  constructor(petId: string, userId: string) {
    this.petId = petId;
    this.userId = userId;
  }

  start(intervalMs: number = 30 * 60 * 1000) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      // 30% 概率触发主动行为
      if (Math.random() < 0.3) {
        this.trigger();
      }
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private trigger() {
    const { addMessage } = useChatStore.getState();
    const message: Message = {
      id: `msg_proactive_${Date.now()}`,
      userId: this.userId,
      petId: this.petId,
      role: 'assistant',
      content: pickRandom(PROACTIVE_MESSAGES),
      emotionTag: 'neutral',
      isActionCompleted: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(message);
  }
}

/**
 * 触发一次探险（手动）
 */
export function triggerExploration(
  petId: string,
  userId: string
): { message: string; gift: ExplorationGift } {
  const giftData = pickRandom(EXPLORATION_GIFTS);
  const gift: ExplorationGift = {
    type: giftData.type,
    content: giftData.content,
  };
  const { addCollectible } = usePetStore.getState();
  addCollectible(gift.content);

  const giftLabel = gift.type === 'quote' ? '金句' :
    gift.type === 'recommendation' ? '好店推荐' : '治愈小诗';
  const message = `我去探险啦！带回来一个${giftLabel}给你～\n\n${gift.content}`;
  const { addMessage } = useChatStore.getState();
  addMessage({
    id: `msg_explore_${Date.now()}`,
    userId,
    petId,
    role: 'assistant',
    content: message,
    emotionTag: 'happy',
    isActionCompleted: false,
    createdAt: new Date().toISOString(),
  });

  return { message, gift };
}

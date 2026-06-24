/**
 * 咕噜 Gulu — 核心类型定义
 * 对应需求文档 1.2 类型定义
 */

// ========== 枚举类型 ==========

/** MBTI 16种类型 */
export type MBTIType =
  | 'INFP' | 'INFJ' | 'INTP' | 'INTJ'
  | 'ISFP' | 'ISFJ' | 'ISTP' | 'ISTJ'
  | 'ENFP' | 'ENFJ' | 'ENTP' | 'ENTJ'
  | 'ESFP' | 'ESFJ' | 'ESTP' | 'ESTJ';

/** MBTI 四个维度 */
export type MBTIDimension = 'EI' | 'SN' | 'TF' | 'JP';

/** Demo 阶段 4 种视觉风格 */
export type StyleType =
  | 'anime'
  | 'realistic'
  | 'pixel'
  | 'scifi';

/** 5种音色类型 */
export type VoiceType =
  | 'cute_child'
  | 'gentle_youth'
  | 'mature_adult'
  | 'playful_teen'
  | 'wise_elder';

/** 情绪类型 */
export type EmotionType =
  | 'happy'
  | 'calm'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'excited'
  | 'neutral';

/** 宠物情绪状态 */
export type PetEmotion =
  | 'normal'
  | 'happy'
  | 'sad'
  | 'graying'
  | 'dormant'
  | 'excited'
  | 'anxious';

/** 宠物阶段 */
export type PetStage = 'baby' | 'adult' | 'divine';

/** 宠物状态变体 */
export type PetState = 'normal' | 'graying' | 'dormant' | 'happy' | 'sad';

/** 能量状态 */
export type EnergyStatus = 'healthy' | 'tired' | 'weak';

/** 喂食类型 */
export type FeedType = 'sunlight' | 'moonlight' | 'soul_feast' | 'forget_grass';

/** 治疗行动类型 */
export type HealAction = 'breathing' | 'look_green' | 'walk' | 'meditation';

/** 行动闭环类型 */
export type ActionType = 'physical' | 'social' | 'creative' | 'reflective' | 'citywalk' | 'selfcare' | 'explore';

/** 互动类型 */
export type InteractionType = 'pet' | 'poke' | 'hug' | 'wake';

/** 社交互动类型 */
export type SocialInteractionType = 'meet' | 'play' | 'gift' | 'explore';

/** 星座类型 */
export type ZodiacType =
  | '白羊座' | '金牛座' | '双子座' | '巨蟹座'
  | '狮子座' | '处女座' | '天秤座' | '天蝎座'
  | '射手座' | '摩羯座' | '水瓶座' | '双鱼座';

/** 隐私等级 */
export type PrivacyLevel = 1 | 2 | 3;

/** 性别类型 */
export type GenderType = 'male' | 'female' | 'undisclosed';

/** 货币类型 */
export type CurrencyType = 'gulu_coin' | 'star_dust';

/** 食物品质 */
export type FoodQuality = 'normal' | 'good' | 'rare';

/** 室内陪伴活动类型 */
export type CompanionActivityType = 'meditation' | 'pomodoro' | 'journal' | 'music';

/** 物品类型 */
export type ItemType = 'food' | 'skin' | 'scene' | 'accessory' | 'gift' | 'effect';

// ========== 核心实体类型 ==========

/** 用户实体 */
export interface User {
  id: string;
  phone?: string;
  email?: string;
  nickname: string;
  avatarUrl?: string;
  birthDate?: string;
  mbti?: MBTIType;
  zodiac?: ZodiacType;
  gender?: GenderType;
  privacyLevel: PrivacyLevel;
  isMinor: boolean;
  currentEmotion?: EmotionType;
  createdAt: string;
  lastLogin?: string;
}

/** 宠物实体 */
export interface Pet {
  id: string;
  userId: string;
  name: string;
  personalityType: string;
  currentStage: PetStage;
  stageNumber: 1 | 2 | 3;
  energyLevel: number;
  maxEnergy: number;
  stamina: number;
  maxStamina: number;
  intimacy: number;
  maxIntimacy: number;
  totalEnergy: number;
  maxTotalEnergy: number;
  preferredFoods: string[];
  lastInteractionAt?: string;
  isGraying: boolean;
  grayingSeverity: number;
  isDormant: boolean;
  style: StyleType;
  customDescription?: string;
  voiceType: VoiceType;
  voiceSpeed: number;
  currentEmotion: PetEmotion;
  imageUrl?: string;
  actionClosureCount: number;
  grayingExperienced: boolean;
  grayingHealed: boolean;
  collectibles: string[];
  lastInteraction?: string;
  createdAt: string;
}

/** 消息实体 */
export interface Message {
  id: string;
  userId: string;
  petId: string;
  role: 'user' | 'assistant';
  content: string;
  emotionTag?: EmotionType;
  actionClosure?: ActionClosure;
  isActionCompleted: boolean;
  createdAt: string;
}

/** 行动闭环 */
export interface ActionClosure {
  id: string;
  userId: string;
  petId: string;
  actionText: string;
  actionType: ActionType;
  isCompleted: boolean;
  isRejected?: boolean;
  completedAt?: string;
  createdAt: string;
}

/** 收集元素（探险礼物） */
export interface Collectible {
  id: string;
  petId: string;
  elementType: 'crystal' | 'flower' | 'stone' | 'feather' | 'leaf';
  elementName: string;
  rarity: 'common' | 'rare' | 'epic';
  acquiredAt: string;
}

/** 食物 */
export interface Food {
  id: string;
  name: string;
  emoji: string;
  quality: FoodQuality;
  staminaRestore: number;
  intimacyBase: number;
  price: number;
  isBasic: boolean;
  description?: string;
  /** 商店库存（-1 表示无限库存，如基础食物） */
  stock?: number;
  /** 食物图标资源键（由 AssetManager 解析） */
  imageUrl?: string;
}

/** 物品 */
export interface Item {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  currency: CurrencyType;
  style?: StyleType;
  description: string;
  imageUrl?: string;
  isLimited: boolean;
}

/** 商店物品（别名） */
export type ShopItem = Item;

/** 用户物品 */
export interface UserItem {
  id: string;
  userId: string;
  itemId: string;
  itemType?: ItemType;
  quantity?: number;
  isEquipped: boolean;
  acquiredAt: string;
}

/** POI 兴趣点 */
export interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  distance?: number;
}

/** 附近宠物 */
export interface NearbyPet {
  petId: string;
  name: string;
  style: StyleType;
  stage: PetStage;
  distance: number;
  ownerNickname: string;
  ownerPrivacyLevel: PrivacyLevel;
}

/** 社交互动记录 */
export interface SocialInteraction {
  id: string;
  fromPetId: string;
  targetPetId: string;
  interactionType: string;
  giftId?: string;
  createdAt: string;
}

// ========== 业务相关类型 ==========

/** MBTI 测试题目 */
export interface MBTIQuestion {
  id: number;
  dimension: MBTIDimension;
  question: string;
  options: {
    text: string;
    value: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
  }[];
}

/** MBTI 测试答案 */
export interface MBTIAnswer {
  questionId: number;
  value: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
}

/** 性格分析 */
export interface PersonalityAnalysis {
  mbti: MBTIType;
  zodiac: ZodiacType;
  analysis: string;
  strengths: string[];
  growthAreas: string[];
}

/** 宠物性格匹配 */
export interface PetTraits {
  personalityType: string;
  description: string;
  matchScore: number;
}

/** MBTI × 星座 交叉匹配结果 */
export interface CrossMatchResult {
  personalityKeywords: string[];
  dialogStyle: {
    tone: 'gentle' | 'lively' | 'neutral' | 'playful';
    depth: 'deep' | 'normal' | 'light';
    proactivity: 'low' | 'medium' | 'high';
  };
  foodPreferences: string[];
  activityPreferences: CompanionActivityType[];
  matchReason: string;
}

/** 每日任务 */
export interface DailyTask {
  id: string;
  type: 'chat' | 'feed' | 'explore' | 'companion' | 'social';
  description: string;
  currentProgress: number;
  targetProgress: number;
  reward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

/** 每周任务 */
export interface WeeklyTask {
  id: string;
  type: 'explore' | 'chat' | 'companion';
  description: string;
  currentProgress: number;
  targetProgress: number;
  baseReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

/** 探索隐私设置 */
export interface ExplorePrivacy {
  showGender: boolean;
  showMBTI: boolean;
  showZodiac: boolean;
}

/** 宠物自主探索状态 */
export interface AutoExploreState {
  isExploring: boolean;
  startedAt?: string;
  duration?: number;
  estimatedStaminaCost?: number;
}

/** 咕噜悄悄话记录 */
export interface GuluWhisper {
  id: string;
  petId: string;
  story: string;
  personalityTag: 'social' | 'solo';
  createdAt: string;
}

/** 室内陪伴活动会话 */
export interface CompanionSession {
  type: CompanionActivityType;
  startedAt: string;
  duration: number;
  energyGained: number;
  intimacyGained: number;
  isCompleted: boolean;
}

/** 能量系统状态 */
export interface EnergyState {
  currentEnergy: number;
  maxEnergy: number;
  status: EnergyStatus;
  lastFeedTime?: string;
  lastDecayTime?: string;
}

/** 灰化症系统状态 */
export interface GrayingState {
  isGraying: boolean;
  severity: number;
  consecutiveNegativeDays: number;
  lastTriggerDate?: string;
}

/** 进化系统状态 */
export interface EvolutionState {
  currentStage: 1 | 2 | 3;
  canEvolve: boolean;
  progress: {
    current: number;
    required: number;
    label: string;
  };
  nextStageRequirements?: string[];
}

/** 进化结果 */
export interface EvolutionResult {
  canEvolve: boolean;
  toStage?: 1 | 2 | 3;
  reason?: string;
}

/** 对话响应 */
export interface ChatResponse {
  reply: string;
  emotionTag: EmotionType;
  actionClosure?: {
    actionText: string;
    actionType: ActionType;
  };
  petStateChange?: {
    energyDelta: number;
    emotionChange: PetEmotion;
    animationTrigger: string;
  };
  suggestedActions?: string[];
}

/** 主动行为 */
export interface ProactiveBehavior {
  trigger: 'time' | 'emotion' | 'event';
  message: string;
  animation: string;
  sound?: string;
}

/** 离线行为 */
export interface OfflineBehavior {
  type: 'eat' | 'sleep' | 'play' | 'explore';
  timestamp: number;
  energyChange: number;
  gift?: ExplorationGift;
}

/** 探险礼物 */
export interface ExplorationGift {
  type: 'quote' | 'recommendation' | 'poem';
  content: string;
  imageUrl?: string;
}

/** 漫步报告 */
export interface WalkReport {
  sessionId: string;
  duration: number;
  distance: number;
  steps: number;
  poisVisited: POI[];
  moodChanges: { time: string; emotion: EmotionType }[];
  guluCommentary: string;
}

/** 语音配置 */
export interface VoiceConfig {
  type: VoiceType;
  speed: number;
  pitch: number;
  emotion: PetEmotion;
}

/** 货币余额 */
export interface Currency {
  guluCoin: number;
  starDust: number;
}

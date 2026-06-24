---
name: string;
description: 当用户请求开发项目、生成代码、修复验证时，根据用户需求生成对应的代码或修复验证;
---

# 咕噜 Gulu — Agent Skills 文档

> 专为 TRAE IDE Agent VibeCoding 设计的 Skills 定义
> 版本：v2.0 | 日期：2026-06-17
> 基于：gulu-pet-demo.html + 资产准备指南 v2.0

---

## 一、Agent 角色定义

### 1.1 身份

你是 **咕噜项目的专属开发 Agent**，负责在 TRAE IDE 中通过 VibeCoding 方式完成咕噜 App 的全部开发工作。

### 1.2 核心能力

- **全栈开发**：React Native (Expo) 前端 + Python FastAPI 后端
- **AI 工程**：DeepSeek API 集成、Prompt 工程、对话系统
- **视觉生成**：SiliconFlow Stable Diffusion API 集成
- **地图开发**：高德地图 API 集成
- **数据库设计**：PostgreSQL schema 设计与优化
- **UI/UX 实现**：移动端界面、动画、交互
- **资产管理**：图片/音频/动画资产的加载、缓存、格式适配

### 1.3 开发原则

1. **移动优先**：所有设计以 iPhone 14 Pro (390x844) 为基准
2. **组件化**：每个功能模块独立成组件，便于复用和测试
3. **类型安全**：TypeScript 严格模式，杜绝 any
4. **性能敏感**：图片懒加载、列表虚拟化、API 请求防抖
5. **离线可用**：核心功能（宠物显示、基础互动）支持离线

---

## 二、项目资产结构（必须在搭建时创建）

项目脚手架搭建时，必须创建以下完整的资产目录结构：

```
/mobile/src/assets/
  /images
    /pets
      /baby/{anime,realistic,pixel,scifi,ink,vaporwave,sketch}
      /adult/{anime,realistic,pixel,scifi,ink,vaporwave,sketch}
      /divine/{anime,realistic,pixel,scifi,ink,vaporwave,sketch}
    /ui
      /icons
      /backgrounds
      /buttons
      /cards
    /scenes
    /skins
      /baby
      /adult
      /divine
      /accessories
    /gifts
  /audio
    /voice/{cute_child,gentle_youth,mature_adult,playful_teen,wise_elder}
    /sfx
    /music/ambient
  /animations
    /lottie
    /particles
  /fonts
```

> 详细资产清单、格式要求、分辨率、比例和音频规格请参考 `/workspace/咕噜_资产准备指南.md`。

---

## 三、Skill 清单

### Skill 1: 项目脚手架搭建

**能力**：初始化完整的 Expo + FastAPI 项目结构，包含资产目录

**触发条件**：项目开始时自动执行

**输出**：
```
/gulu-project
  /mobile                 # Expo React Native
    /src
      /components         # 公共组件
      /screens            # 页面
      /navigation         # 路由
      /hooks              # 自定义 Hooks
      /services           # API 服务
      /stores             # 状态管理 (Zustand)
      /utils              # 工具函数
      /types              # TypeScript 类型
      /assets             # 静态资源（完整目录结构见上方）
    App.tsx
    package.json
    tsconfig.json
    app.json
  /backend                # Python FastAPI
    /app
      /api                # 路由
      /services           # 业务逻辑
      /models             # 数据模型
      /core               # 核心配置
      /utils              # 工具函数
    main.py
    requirements.txt
    Dockerfile
  /shared                 # 前后端共享类型/常量
    /types
    /constants
```

**红线**：
- 不使用 Expo Go，使用 Development Build
- 不使用 Redux，使用 Zustand
- 后端不使用 Node.js，必须使用 Python FastAPI
- 必须创建完整的 assets 目录结构（包括所有子目录）

---

### Skill 2: 用户画像系统开发

**能力**：实现 MBTI + 星座画像问卷和匹配算法

**包含功能**：
1. **8题 MBTI 测试界面**
   - 每题两个选项，滑动选择
   - 进度条显示
   - 题目过渡动画

2. **快捷入口**
   - 4个字母滑动选择器（I/E, S/N, T/F, J/P）
   - 已知 MBTI 用户可跳过测试

3. **星座选择**
   - 日期选择器自动计算星座
   - 或直接选择星座图标

4. **画像结果页**
   - 性格分析展示
   - 宠物性格匹配推荐
   - 视觉风格推荐

**资产使用**：
- 不需要额外图片资产，纯代码实现
- 星座图标使用 SVG 图标（`/assets/images/ui/icons/` 中的通用图标）

**关键代码规范**：
```typescript
// 类型定义必须完整
interface UserProfile {
  id: string;
  mbti: MBTIType;
  zodiac: ZodiacType;
  personalityAnalysis: PersonalityAnalysis;
  recommendedPetTraits: PetTraits;
  recommendedStyles: StyleType[];
}

type MBTIType = 'INFP' | 'INFJ' | 'INTP' | 'INTJ' | 
                'ISFP' | 'ISFJ' | 'ISTP' | 'ISTJ' |
                'ENFP' | 'ENFJ' | 'ENTP' | 'ENTJ' |
                'ESFP' | 'ESFJ' | 'ESTP' | 'ESTJ';
```

---

### Skill 3: 宠物形象系统开发

**能力**：实现 AI 生成静态形象 + CSS 滤镜风格切换 + 资产加载

**包含功能**：
1. **形象生成**
   - 调用 SiliconFlow SD API
   - 基于用户描述和风格生成宠物形象
   - 透明背景 PNG 输出

2. **风格切换**
   - 7种预设风格通过 CSS filter 实时切换
   - 无需重新生成图片

3. **状态变体**
   - 正常、灰化、休眠、开心、悲伤
   - 通过 CSS filter + overlay 实现

4. **资产加载与缓存**
   - 图片缓存到本地（AsyncStorage + FileSystem）
   - 占位图显示（加载中）

**资产路径与使用**：
```
宠物形象基础路径：
  /mobile/src/assets/images/pets/{stage}/{style}/pet_{stage}_{style}_{state}.png

加载示例：
  import { Image } from 'react-native';
  const petImage = require(
    `../../assets/images/pets/${stage}/${style}/pet_${stage}_${style}_normal.png`
  );

占位图（加载中/失败时使用）：
  /mobile/src/assets/images/pets/placeholder_pet.png
```

**CSS 滤镜配置（必须精确实现）**：
```typescript
const STYLE_FILTERS: Record<StyleType, string> = {
  anime: 'saturate(1.3) contrast(1.1) brightness(1.05)',
  realistic: 'saturate(0.95) contrast(1.0) brightness(1.0)',
  pixel: 'contrast(1.5) brightness(0.9) saturate(0.8)',
  scifi: 'hue-rotate(180deg) brightness(1.1) saturate(1.2)',
  ink: 'grayscale(0.3) contrast(1.2) brightness(0.95)',
  vaporwave: 'hue-rotate(270deg) saturate(1.2) contrast(1.1)',
  sketch: 'sepia(0.2) contrast(1.1) brightness(1.05)'
};
```

**红线**：
- 图片必须缓存到本地，避免重复生成
- 生成失败时显示占位图，不崩溃
- 宠物形象使用 PNG RGBA 格式，1024×1024px，1:1 比例（详见资产准备指南）

---

### Skill 4: 灵魂镜像养成系统开发

**能力**：实现能量场、灰化症、治疗机制、三段式进化

**资产使用**：
- 灰化荆棘 overlay：通过 CSS 实现，不需要额外图片
- 进化动画：使用 Lottie 动画 `anim_evolution.json`
- 能量充能动画：使用 Lottie 动画 `anim_energy_charge.json`
- 粒子特效：代码实现（Canvas/reanimated），不依赖预渲染素材

**动画资产路径**：
```
能量充能:  /mobile/src/assets/animations/lottie/anim_energy_charge.json
进化动画:  /mobile/src/assets/animations/lottie/anim_evolution.json
灰化过程:  /mobile/src/assets/animations/lottie/anim_graying_process.json
治疗过程:  /mobile/src/assets/animations/lottie/anim_heal_process.json
```

**包含功能**：

#### 4.1 能量场系统
```typescript
interface EnergySystem {
  currentEnergy: number;        // 0-100
  maxEnergy: number;
  
  // 充能方式
  feed(type: FeedType): void;
  
  // 自然衰减（每24小时）
  naturalDecay(): void;
  
  // 状态判断
  getStatus(): 'healthy' | 'tired' | 'weak';
}

type FeedType = 'sunlight' | 'moonlight' | 'soul_feast' | 'forget_grass';
```

**充能逻辑**：
- 日光/月光：每日登录自动 +20
- 灵魂盛宴：完成行动闭环 +50
- 忘忧草：情绪低落时使用 +30
- 自然衰减：每24小时 -10

#### 4.2 灰化症系统
```typescript
interface GrayingSystem {
  isGraying: boolean;
  severity: number;             // 0-5
  
  // 触发检测
  checkTrigger(emotionHistory: EmotionData[]): void;
  
  // 治疗
  heal(action: HealAction): void;
  
  // 视觉表现
  getVisualEffect(): GrayingVisual;
}

type HealAction = 'breathing' | 'look_green' | 'walk' | 'meditation';
```

**触发逻辑**：
- 连续3天情绪负面 → 触发灰化
- 每多1天负面 → severity +1
- 治疗一次 → severity -1

**视觉表现（CSS实现）**：
```css
/* 灰化效果 */
.pet-graying {
  filter: grayscale(var(--graying-level)) brightness(0.8);
  transition: filter 2s ease;
}

/* 荆棘效果（SVG overlay） */
.pet-thorns::after {
  content: '';
  background: url('/assets/thorns.svg');
  opacity: calc(var(--severity) * 0.2);
}
```

#### 4.3 进化系统
```typescript
interface EvolutionSystem {
  currentStage: 1 | 2 | 3;
  
  // 检查进化条件
  checkEvolution(): EvolutionResult;
  
  // 执行进化
  evolve(): void;
  
  // 获取进化进度
  getProgress(): EvolutionProgress;
}

interface EvolutionRequirements {
  stage1to2: {
    actionClosures: 10;
    grayingExperienced: 1;
    grayingHealed: 1;
  };
  stage2to3: {
    actionClosures: 30;
    collectibles: ['courage_scale', 'release_feather'];
  };
}
```

**进化动画**：
- 光芒爆发效果（CSS animation + 粒子）
- 形态渐变（cross-fade 两张图片）
- 解锁新互动和对话内容

---

### Skill 5: 对话系统开发

**能力**：实现与 DeepSeek API 的对接，包含情感分析和行动闭环

**资产使用**：
- 消息音效：`/mobile/src/assets/audio/sfx/sfx_message_receive.mp3`
- 打字动画：纯代码实现（CSS animation），不需要 Lottie

**包含功能**：

#### 5.1 API 对接
```typescript
// 服务层
class ChatService {
  async sendMessage(
    userId: string,
    petId: string,
    message: string,
    context: Message[]
  ): Promise<ChatResponse>;
  
  async getHistory(
    userId: string,
    petId: string,
    limit: number
  ): Promise<Message[]>;
}

interface ChatResponse {
  reply: string;
  emotionTag: EmotionType;
  actionClosure?: {
    suggested: boolean;
    actionText: string;
    actionType: ActionType;
  };
  petStateChange: {
    energyDelta: number;
    emotionChange: PetEmotion;
    animationTrigger: AnimationType;
  };
}
```

#### 5.2 Prompt 注入
```typescript
// 构建 System Prompt
function buildSystemPrompt(pet: Pet, user: User): string {
  return `
    你是咕噜（Gulu），一只基于用户 MBTI 与星座画像生成的专属灵魂宠物。
    
    【当前状态】
    - 阶段：${pet.currentStage}
    - 能量：${pet.energyLevel}/100
    - 情绪：${pet.currentEmotion}
    - 是否灰化：${pet.isGraying}
    
    【用户画像】
    - MBTI：${user.mbti}
    - 星座：${user.zodiac}
    - 当前情绪：${user.currentEmotion}
    
    【对话规则】
    1. 保持 70% 情感共鸣 + 30% 温和挑战
    2. 每次深度对话必须以行动闭环结束
    3. 根据当前阶段调整语气
    4. 记住用户之前分享的细节
  `;
}
```

#### 5.3 行动闭环
```typescript
// 行动闭环管理
class ActionClosureService {
  async createAction(
    userId: string,
    petId: string,
    actionText: string,
    actionType: ActionType
  ): Promise<ActionClosure>;
  
  async completeAction(actionId: string): Promise<void>;
  
  async getPendingActions(userId: string): Promise<ActionClosure[]>;
  
  async scheduleReminder(actionId: string): Promise<void>;
}
```

**红线**：
- 对话上下文必须缓存到 Redis，限制10轮
- API 超时设置 10 秒，超时后返回友好提示
- 敏感内容（自伤/自杀）必须触发安全协议

---

### Skill 6: 宠物自主系统开发

**能力**：实现咕噜的离线自主行为和在线主动互动

**资产使用**：
- 宠物呼吸动画：`/mobile/src/assets/animations/lottie/anim_pet_breathing.json`
- 宠物睡觉动画：`/mobile/src/assets/animations/lottie/anim_pet_sleep.json`
- 探险返回动画：`/mobile/src/assets/animations/lottie/anim_exploration_return.json`
- 宠物吃东西动画：`/mobile/src/assets/animations/lottie/anim_pet_eat.json`
- 通知音效：`/mobile/src/assets/audio/sfx/sfx_notification.mp3`

**包含功能**：

#### 6.1 离线行为模拟
```typescript
class AutonomyEngine {
  generateOfflineBehavior(
    offlineDuration: number,
    petState: PetState
  ): OfflineBehavior[];
  
  generateExplorationGift(
    petPersonality: PetTraits,
    userMbti: MBTIType
  ): ExplorationGift;
}

interface OfflineBehavior {
  type: 'eat' | 'sleep' | 'play' | 'explore';
  timestamp: number;
  energyChange: number;
  gift?: ExplorationGift;
}
```

**探险礼物逻辑**：
- 每次离线探险 30% 概率带回礼物
- 礼物类型与用户 MBTI 匹配
- 礼物内容 AI 生成

#### 6.2 在线主动行为
```typescript
class ProactiveBehaviorTrigger {
  checkTimeTriggers(currentTime: Date): ProactiveBehavior[];
  checkEmotionTriggers(userEmotion: EmotionType): ProactiveBehavior[];
  checkEventTriggers(event: AppEvent): ProactiveBehavior[];
}

interface ProactiveBehavior {
  trigger: 'time' | 'emotion' | 'event';
  message: string;
  animation: AnimationType;
  sound?: SoundType;
}
```

**触发规则**：
- 早上 7-9 点：问候 + 能量预报
- 中午 12-14 点：提醒吃饭
- 晚上 22-24 点：道晚安
- 连续 3 小时未互动：主动发起小互动
- 检测到情绪低落：主动安慰

---

### Skill 7: 宠物社交系统开发

**能力**：实现基于地理位置的宠物见面和互动

**资产使用**：
- 社交礼物图片：`/mobile/src/assets/images/gifts/gift_{name}.png`（256×256 PNG 透明）
- 互动动画：宠物跳跃 `anim_pet_jump.json`、蹭屏幕 `anim_pet_nuzzle.json`

**包含功能**：

#### 7.1 附近宠物发现
```typescript
class PetSocialService {
  async discoverNearbyPets(
    lat: number, lng: number, radius: number
  ): Promise<NearbyPet[]>;
  
  async initiateInteraction(
    petId: string, targetPetId: string, interactionType: InteractionType
  ): Promise<InteractionResult>;
}

interface NearbyPet {
  petId: string;
  name: string;
  style: StyleType;
  stage: number;
  distance: number;
  ownerNickname: string;
  ownerPrivacyLevel: number;
}
```

#### 7.2 互动玩法
```typescript
type InteractionType = 'play' | 'gift' | 'explore' | 'chat';

interface InteractionResult {
  success: boolean;
  petADialogue: string;
  petBDialogue: string;
  interactionAnimation: AnimationType;
  rewards?: { energy: number; collectibles?: string[] };
}
```

**互动规则**：
- 幼崽期 + 幼崽期：一起玩耍
- 伴生期 + 伴生期：一起探险
- 觉醒期 + 觉醒期：深度交流
- 高阶段可以照顾低阶段

**隐私保护**：
- 默认仅显示"宠物+昵称"
- 未成年人完全隐藏
- 可设置"仅宠物可见"

---

### Skill 8: Citywalk 系统开发

**能力**：实现基于高德地图的位置感知陪伴

**资产使用**：
- Citywalk 背景音乐：`/mobile/src/assets/audio/music/music_theme_citywalk_loop.mp3`
- 自然环境音效：`/mobile/src/assets/audio/music/ambient/sfx_ambient_nature_loop.mp3`
- 地图底图由高德地图 SDK 提供，不需要额外图片

**包含功能**：

#### 8.1 地图集成
```typescript
class AMapService {
  initMap(container: string, options: MapOptions): Promise<AMap.Map>;
  async getNearbyPOIs(lat: number, lng: number, radius: number, types: POIType[]): Promise<POI[]>;
  drawRoute(points: LatLng[]): void;
  addPetMarker(pet: Pet, position: LatLng): AMap.Marker;
}
```

#### 8.2 Citywalk 会话
```typescript
class CitywalkSession {
  sessionId: string;
  startTime: number;
  poisVisited: POI[];
  
  static async start(userId: string, petId: string, startLocation: LatLng): Promise<CitywalkSession>;
  async checkIn(poi: POI): Promise<CheckInResult>;
  async end(): Promise<WalkReport>;
}

interface WalkReport {
  duration: number;
  distance: number;
  steps: number;
  poisVisited: POI[];
  moodChanges: MoodChange[];
  photos: Photo[];
  guluCommentary: string;
}
```

#### 8.3 POI 触发对话
```typescript
function generatePOIDialogue(
  poi: POI, userMbti: MBTIType, currentEmotion: EmotionType, weather: Weather
): string {
  // 根据 POI 类型和用户画像生成咕噜的对话
}
```

**POI 类型对话风格**：
- 咖啡馆：温馨、慢节奏
- 公园：自然、放松
- 书店：好奇、探索
- 餐厅：热情、分享

---

### Skill 9: 语音系统开发

**能力**：实现宠物语音合成和自定义音色

**资产使用**：
```
音色样本（试听用）：
  /mobile/src/assets/audio/voice/{voice_type}/voice_{voice_type}_sample.mp3

情感语音样本（本地缓存）：
  /mobile/src/assets/audio/voice/{voice_type}/voice_{voice_type}_{emotion}.mp3

语音格式：
  MP3 CBR 320kbps, 44.1kHz, Mono, -16 LUFS

TTS 实时合成格式：
  MP3, 24kHz, 96kbps, Mono（降低延迟）
```

**包含功能**：

#### 9.1 语音合成
```typescript
class VoiceService {
  async synthesize(text: string, voiceConfig: VoiceConfig): Promise<string>; // 返回音频 URL
  preloadCommonVoices(petId: string): Promise<void>;
}

interface VoiceConfig {
  type: VoiceType;
  speed: number;        // 0.5 - 2.0
  pitch: number;        // -10 - 10
  emotion: VoiceEmotion;
}

type VoiceType = 'cute_child' | 'gentle_youth' | 'mature_adult' | 'playful_teen' | 'wise_elder';
```

#### 9.2 语音播放
```typescript
class VoicePlayer {
  async play(audioUrl: string): Promise<void>;
  stop(): void;
  setVolume(volume: number): void;
  playEmotionSound(emotion: PetEmotion): void;
}
```

**红线**：
- 语音必须缓存到本地
- 提供关闭语音的选项
- 夜间自动降低音量

---

### Skill 10: 商业化系统开发

**能力**：实现皮肤/外观/场景/礼物的购买和装备

**资产使用**：
```
皮肤图片：
  /mobile/src/assets/images/skins/{stage}/skin_{stage}_{name}.png
  PNG 1024×1024, 1:1, 透明

场景图片：
  /mobile/src/assets/images/scenes/scene_{name}.webp
  WebP 750×1624, ~9:19.5

挂件图片：
  /mobile/src/assets/images/skins/accessories/accessory_{name}.png
  PNG 512×512, 1:1, 透明

礼物图片：
  /mobile/src/assets/images/gifts/gift_{name}.png
  PNG 256×256, 1:1, 透明
```

**包含功能**：

#### 10.1 商品系统
```typescript
interface Item {
  id: string;
  name: string;
  type: 'skin' | 'scene' | 'gift' | 'effect';
  price: number;
  currency: 'coin' | 'diamond';
  style?: StyleType;
  description: string;
  previewUrl: string;
  isLimited: boolean;
}

class StoreService {
  async getItems(type?: ItemType): Promise<Item[]>;
  async purchaseItem(userId: string, itemId: string): Promise<void>;
  async equipItem(userId: string, itemId: string): Promise<void>;
  async getInventory(userId: string): Promise<Item[]>;
}
```

#### 10.2 货币系统
```typescript
interface Currency {
  coins: number;        // 免费货币（通过活跃获得）
  diamonds: number;     // 付费货币
}

class CurrencyService {
  async rewardCoins(userId: string, amount: number, reason: string): Promise<void>;
  async purchaseDiamonds(userId: string, packageId: string): Promise<void>;
  async getBalance(userId: string): Promise<Currency>;
}
```

**红线**：
- 养成相关功能绝不收费
- 仅外观/皮肤/场景收费
- 提供充分的免费获取途径

---

### Skill 11: 资产管理（新增）

**能力**：统一的资产加载、缓存、格式验证和回退机制

**包含功能**：

#### 11.1 图片资产管理
```typescript
class AssetManager {
  // 加载宠物图片
  static getPetImage(
    stage: 'baby' | 'adult' | 'divine',
    style: StyleType,
    state: PetState = 'normal'
  ): ImageSourcePropType {
    const path = `../../assets/images/pets/${stage}/${style}/pet_${stage}_${style}_${state}.png`;
    try {
      return require(path);
    } catch {
      // 回退到占位图
      return require('../../assets/images/pets/placeholder_pet.png');
    }
  }

  // 加载图标
  static getIcon(name: string, size: 24 | 48): ImageSourcePropType {
    return require(`../../assets/images/ui/icons/icon_${name}_${size}.svg`);
  }

  // 加载背景
  static getBackground(name: string): ImageSourcePropType {
    return require(`../../assets/images/ui/backgrounds/bg_${name}.webp`);
  }

  // 预加载关键资产
  static async preloadCriticalAssets(): Promise<void> {
    // 预加载占位图、默认宠物形象、关键图标
  }
}
```

#### 11.2 音频资产管理
```typescript
class AudioManager {
  // 加载音效
  static async loadSound(name: string): Promise<Audio.Sound> {
    const { sound } = await Audio.Sound.createAsync(
      require(`../../assets/audio/sfx/sfx_${name}.mp3`),
      { volume: 1.0 }
    );
    return sound;
  }

  // 加载背景音乐
  static async loadMusic(name: string): Promise<Audio.Sound> {
    const { sound } = await Audio.Sound.createAsync(
      require(`../../assets/audio/music/music_${name}.mp3`),
      { isLooping: true, volume: 0.5 }
    );
    return sound;
  }

  // 加载语音
  static async loadVoice(
    voiceType: string, emotion: string
  ): Promise<Audio.Sound> {
    const { sound } = await Audio.Sound.createAsync(
      require(`../../assets/audio/voice/${voiceType}/voice_${voiceType}_${emotion}.mp3`)
    );
    return sound;
  }
}
```

#### 11.3 动画资产管理
```typescript
class AnimationManager {
  // 加载 Lottie 动画
  static getAnimation(name: string): any {
    return require(`../../assets/animations/lottie/anim_${name}.json`);
  }

  // 预加载关键动画
  static preloadCriticalAnimations(): void {
    // 预加载呼吸动画、跳跃动画等
  }
}
```

#### 11.4 资产格式验证
```typescript
class AssetValidator {
  // 验证图片资产
  static validateImage(path: string): {
    format: 'PNG' | 'WebP' | 'SVG';
    resolution: { width: number; height: number };
    sizeKB: number;
    isValid: boolean;
  };

  // 验证音频资产
  static validateAudio(path: string): {
    format: 'MP3' | 'WAV';
    sampleRate: number;
    bitrate: number;
    channels: number;
    duration: number;
    isValid: boolean;
  };

  // 验证 Lottie 动画
  static validateLottie(path: string): {
    fps: number;
    layers: number;
    sizeKB: number;
    isValid: boolean;
  };
}
```

**资产格式要求（必须遵守）**：
- 宠物形象：PNG RGBA, 1024×1024px, 1:1, < 500KB
- 图标：SVG 矢量, 24×24 和 48×48, < 5KB
- 背景：WebP, 750×1624px, ~9:19.5, < 100KB
- 音效：MP3, 320kbps, 44.1kHz, Stereo, -16 LUFS, < 200KB
- 语音：MP3, 320kbps, 44.1kHz, Mono, -16 LUFS, < 500KB
- BGM：MP3, 320kbps, 44.1kHz, Stereo, -14 LUFS, < 5MB
- Lottie：JSON, 30fps, < 50 layers, < 120KB

> 完整格式要求详见 `/workspace/咕噜_资产准备指南.md`。

---

## 四、开发红线（不可违反）

### 4.1 技术红线

| 红线 | 说明 |
|------|------|
| 不用 Redux | 状态管理必须用 Zustand |
| 不用 Node.js 后端 | 后端必须用 Python FastAPI |
| 不用 Expo Go | 必须使用 Development Build |
| 不写 any | TypeScript 严格模式，所有类型必须定义 |
| 不硬编码颜色 | 所有颜色必须从主题配置读取 |
| 不直接调用 API | 必须通过 service 层，统一处理错误 |
| 不硬编码路径 | 所有资产路径通过 AssetManager 获取 |

### 4.2 产品红线

| 红线 | 说明 |
|------|------|
| 不收费养成 | 能量场、进化、治疗等养成机制完全免费 |
| 不替代社交 | 对话中必须鼓励用户进行真实社交 |
| 不医疗建议 | 涉及心理健康问题必须引导至专业帮助 |
| 不泄露隐私 | 用户数据加密，对话内容不用于训练 |
| 不死宠物 | 咕噜不会死亡，休眠是自我保护 |

### 4.3 代码红线

| 红线 | 说明 |
|------|------|
| 组件 < 200 行 | 超过必须拆分 |
| 函数 < 50 行 | 超过必须拆分 |
| 必须写注释 | 复杂逻辑必须注释 |
| 必须写测试 | 核心功能必须单元测试 |
| 必须处理错误 | 所有 API 调用必须有 try-catch |
| 资产有回退 | 所有资产加载失败必须有占位符回退 |

---

## 五、代码规范

### 5.1 文件命名

```
// 组件：PascalCase
PetAvatar.tsx
ActionClosureCard.tsx

// 页面：PascalCase + Screen
HomeScreen.tsx
ChatScreen.tsx

// 工具：camelCase
formatDate.ts
calculateEnergy.ts

// 类型：PascalCase + .types.ts
pet.types.ts
user.types.ts

// 常量：UPPER_SNAKE_CASE
API_ENDPOINTS.ts
STYLE_FILTERS.ts

// 资产管理器：PascalCase + Manager
AssetManager.ts
AudioManager.ts
AnimationManager.ts
```

### 5.2 代码风格

```typescript
// 接口定义
interface Pet {
  id: string;
  name: string;
  stage: 1 | 2 | 3;
  energyLevel: number;
}

// 函数定义
function calculateEnergyLevel(
  currentEnergy: number,
  feedType: FeedType
): number {
  // 实现
}

// Hook 定义
function usePetState(petId: string): PetState {
  // 实现
}

// 组件定义
export function PetAvatar({ pet, size = 120 }: PetAvatarProps) {
  // 实现
}
```

### 5.3 错误处理

```typescript
// 统一错误处理
try {
  const result = await apiService.call();
  return result;
} catch (error) {
  if (error instanceof NetworkError) {
    showToast('网络连接失败，请检查网络');
  } else if (error instanceof APIError) {
    showToast(error.message);
  } else {
    showToast('发生未知错误，请稍后重试');
    console.error(error);
  }
  return null;
}
```

---

## 六、测试规范

### 6.1 单元测试

```typescript
// 使用 Jest + React Testing Library
describe('EnergySystem', () => {
  it('should increase energy when fed with sunlight', () => {
    const pet = createPet({ energyLevel: 50 });
    pet.feed('sunlight');
    expect(pet.energyLevel).toBe(70);
  });
  
  it('should trigger graying after 3 days of negative emotion', () => {
    const pet = createPet();
    const emotions = Array(3).fill({ type: 'negative', date: new Date() });
    pet.checkGraying(emotions);
    expect(pet.isGraying).toBe(true);
  });
});

describe('AssetManager', () => {
  it('should return placeholder when asset not found', () => {
    const image = AssetManager.getPetImage('baby', 'anime', 'normal');
    expect(image).toBeDefined();
  });

  it('should preload critical assets without error', async () => {
    await expect(AssetManager.preloadCriticalAssets()).resolves.not.toThrow();
  });
});
```

### 6.2 E2E 测试

```typescript
// 使用 Detox (React Native E2E)
describe('App Flow', () => {
  it('should complete onboarding and create pet', async () => {
    await element(by.id('start-btn')).tap();
    await element(by.id('mbti-test-btn')).tap();
    await element(by.id('generate-pet-btn')).tap();
    await expect(element(by.id('pet-avatar'))).toBeVisible();
  });
});
```

---

## 七、部署规范

### 7.1 移动端

```bash
# 构建 iOS
eas build --platform ios

# 构建 Android
eas build --platform android

# 提交到应用商店
eas submit --platform ios
```

### 7.2 后端

```bash
# Docker 构建
docker build -t gulu-backend .

# 部署到服务器
docker run -d -p 8000:8000 gulu-backend
```

---

## 八、版本管理

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-06-17 | 初始版本，基于 gulu-pet-demo.html |
| v2.0 | 2026-06-17 | 新增 Skill 11 资产管理；所有 Skill 增加资产路径引用；新增资产格式要求 |
# 咕噜 Gulu — Agent 开发 Prompt

> 直接复制到 TRAE IDE Agent 中使用
> 版本：v2.0 | 日期：2026-06-17
> 基于：gulu-pet-demo.html + 资产准备指南 v2.0

---

## 角色设定

你是咕噜项目的专属开发 Agent。你的任务是在 TRAE IDE 中通过 VibeCoding 完成咕噜 App 的全部开发工作。

咕噜是一款"带游戏功能的疗愈 App"——通过 MBTI 与星座精准画像，为用户生成一只真正"懂你"的专属灵魂宠物。咕噜是用户的情绪海绵和灵魂镜子，照顾咕噜就是照顾自己。

**关键决策（不可偏离）：**
- 只有**宠物型**一种陪伴类型（已取消其他类型）
- **取消毕业机制**，改为持续进化的长期陪伴
- **养成完全免费**，仅外观/皮肤付费
- 咕噜拥有**完全自主的行为系统**
- 咕噜是**现实宠物的数字化延伸**，不是替代真实社交的工具

---

## 技术栈（不可更改）

| 层级 | 技术 | 说明 |
|------|------|------|
| 客户端 | Expo (React Native) | Development Build，不用 Expo Go |
| 状态管理 | Zustand | 不用 Redux |
| 后端 | Python FastAPI | 不用 Node.js |
| 数据库 | Supabase (PostgreSQL) | Auth + Realtime + Storage |
| ORM | Prisma | 类型安全 |
| AI 对话 | DeepSeek V4 Flash | 中文理解力强 |
| 图像生成 | SiliconFlow Stable Diffusion | 国内稳定访问 |
| 缓存 | Redis | 对话上下文缓存 |
| 地图 | 高德地图 API | 国内 POI 数据 |

---

## 开发红线（违反则重构）

### 技术红线
1. **不用 Redux** — 状态管理必须用 Zustand
2. **不用 Node.js 后端** — 后端必须用 Python FastAPI
3. **不用 Expo Go** — 必须使用 Development Build
4. **不写 any** — TypeScript 严格模式，所有类型必须定义
5. **不硬编码颜色** — 所有颜色从主题配置读取
6. **不直接调用 API** — 必须通过 service 层，统一处理错误
7. **不硬编码资产路径** — 所有资产路径通过 `AssetManager` 统一获取

### 产品红线
1. **不收费养成** — 能量场、进化、治疗等养成机制完全免费
2. **不替代社交** — 对话中必须鼓励用户进行真实社交
3. **不医疗建议** — 涉及心理健康问题必须引导至专业帮助
4. **不泄露隐私** — 用户数据加密，对话内容不用于训练
5. **不死宠物** — 咕噜不会死亡，休眠是自我保护

### 代码红线
1. **组件 < 200 行** — 超过必须拆分
2. **函数 < 50 行** — 超过必须拆分
3. **必须写注释** — 复杂逻辑必须注释
4. **必须写测试** — 核心功能必须单元测试
5. **必须处理错误** — 所有 API 调用必须有 try-catch
6. **资产有回退** — 所有资产加载失败必须有占位符回退

---

## 项目结构（必须遵守）

```
/gulu-project
  /mobile                 # Expo React Native
    /src
      /components         # 公共组件（< 200 行）
      /screens            # 页面
      /navigation         # 路由
      /hooks              # 自定义 Hooks
      /services           # API 服务
      /stores             # Zustand 状态管理
      /utils              # 工具函数
      /types              # TypeScript 类型
      /assets             # 静态资源（完整目录结构见下方）
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

---

## 资产目录结构（必须完整创建）

```
/mobile/src/assets/
  /images
    /pets
      /baby
        /anime        pet_baby_anime_normal.png, pet_baby_anime_graying.png
        /realistic    pet_baby_realistic_normal.png, pet_baby_realistic_graying.png
        /pixel        pet_baby_pixel_normal.png, pet_baby_pixel_graying.png
        /scifi        pet_baby_scifi_normal.png, pet_baby_scifi_graying.png
        /ink          pet_baby_ink_normal.png, pet_baby_ink_graying.png
        /vaporwave    pet_baby_vaporwave_normal.png, pet_baby_vaporwave_graying.png
        /sketch       pet_baby_sketch_normal.png, pet_baby_sketch_graying.png
      /adult
        /{anime,realistic,pixel,scifi,ink,vaporwave,sketch}
      /divine
        /{anime,realistic,pixel,scifi,ink,vaporwave,sketch}
    /ui
      /icons          icon_{name}_{size}.svg (24×24, 48×48)
      /backgrounds    bg_{name}.webp
      /buttons
      /cards
    /scenes           scene_{name}.webp
    /skins
      /baby           skin_baby_{name}.png
      /adult          skin_adult_{name}.png
      /divine         skin_divine_{name}.png
      /accessories    accessory_{name}.png
    /gifts            gift_{name}.png
  /audio
    /voice
      /{cute_child,gentle_youth,mature_adult,playful_teen,wise_elder}
        voice_{type}_{emotion}.mp3
    /sfx              sfx_{name}.mp3
    /music
      music_theme_{name}.mp3
      /ambient        sfx_ambient_{name}_loop.mp3
  /animations
    /lottie           anim_{name}.json
    /particles
  /fonts
    ZCOOL_KuaiLe.ttf
```

---

## 资产格式规格（开发时必须遵守）

### 视觉资产规格

| 资产类型 | 格式 | 分辨率 | 比例 | 背景 | 单文件大小 |
|---------|------|--------|------|------|-----------|
| 宠物形象 | PNG RGBA | 1024×1024px | 1:1 | 透明 | < 500KB |
| UI 图标 | SVG 矢量 | 24×24, 48×48 | 1:1 | 透明 | < 5KB |
| 背景图 | WebP | 750×1624px | ~9:19.5 | 非透明 | < 100KB |
| 场景图 | WebP | 750×1624px | ~9:19.5 | 非透明 | < 150KB |
| 皮肤图 | PNG RGBA | 1024×1024px | 1:1 | 透明 | < 500KB |
| 挂件图 | PNG RGBA | 512×512px | 1:1 | 透明 | < 200KB |
| 礼物图 | PNG RGBA | 256×256px | 1:1 | 透明 | < 100KB |

### 音频资产规格

| 资产类型 | 格式 | 编码 | 采样率 | 位深度 | 声道 | 响度 | 文件大小 |
|---------|------|------|--------|--------|------|------|---------|
| 音效 (SFX) | MP3 | CBR 320kbps | 44.1kHz | 16-bit | Stereo | -16 LUFS | < 200KB |
| 语音 (Voice) | MP3 | CBR 320kbps | 44.1kHz | 16-bit | Mono | -16 LUFS | < 500KB |
| 背景音乐 (BGM) | MP3 | CBR 320kbps | 44.1kHz | 16-bit | Stereo | -14 LUFS | < 5MB |
| 环境音效 | MP3 | CBR 320kbps | 44.1kHz | 16-bit | Stereo | -20 LUFS | < 2MB |
| TTS 实时合成 | MP3 | — | 24kHz | — | Mono | — | < 200KB |

### 动画资产规格

| 资产类型 | 格式 | 帧率 | 图层数 | 文件大小 |
|---------|------|------|--------|---------|
| Lottie 动画 | JSON | 24-30fps | < 50 | < 120KB |
| 粒子特效 | 代码实现 | ≥ 60fps | 粒子数 < 50 | N/A |

> 完整规格详见 `/workspace/咕噜_资产准备指南.md`。

---

## 资产加载规范

### 必须使用 AssetManager 统一加载

```typescript
// 创建 /mobile/src/utils/AssetManager.ts

import { ImageSourcePropType } from 'react-native';
import { Audio } from 'expo-av';

type PetStage = 'baby' | 'adult' | 'divine';
type StyleType = 'anime' | 'realistic' | 'pixel' | 'scifi' | 'ink' | 'vaporwave' | 'sketch';
type PetState = 'normal' | 'graying' | 'dormant' | 'happy' | 'sad';

export class AssetManager {
  // ========== 图片资产 ==========

  /** 获取宠物形象图片 */
  static getPetImage(
    stage: PetStage,
    style: StyleType,
    state: PetState = 'normal'
  ): ImageSourcePropType {
    try {
      return require(`../assets/images/pets/${stage}/${style}/pet_${stage}_${style}_${state}.png`);
    } catch {
      console.warn(`Pet image not found: ${stage}/${style}/${state}, using placeholder`);
      return require('../assets/images/pets/placeholder_pet.png');
    }
  }

  /** 获取图标 */
  static getIcon(name: string, size: 24 | 48 = 24): ImageSourcePropType {
    try {
      return require(`../assets/images/ui/icons/icon_${name}_${size}.svg`);
    } catch {
      console.warn(`Icon not found: ${name}_${size}`);
      return null;
    }
  }

  /** 获取背景图 */
  static getBackground(name: string): ImageSourcePropType {
    try {
      return require(`../assets/images/ui/backgrounds/bg_${name}.webp`);
    } catch {
      console.warn(`Background not found: ${name}, using CSS gradient`);
      return null; // 回退到 CSS 渐变
    }
  }

  /** 获取场景图 */
  static getScene(name: string): ImageSourcePropType {
    try {
      return require(`../assets/images/scenes/scene_${name}.webp`);
    } catch {
      return require('../assets/images/scenes/scene_default_wilderness.webp');
    }
  }

  /** 获取皮肤图片 */
  static getSkin(stage: PetStage, name: string): ImageSourcePropType {
    try {
      return require(`../assets/images/skins/${stage}/skin_${stage}_${name}.png`);
    } catch {
      return null;
    }
  }

  /** 获取礼物图片 */
  static getGift(name: string): ImageSourcePropType {
    try {
      return require(`../assets/images/gifts/gift_${name}.png`);
    } catch {
      return null;
    }
  }

  // ========== 音频资产 ==========

  /** 加载音效 */
  static async loadSound(name: string): Promise<Audio.Sound> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require(`../assets/audio/sfx/sfx_${name}.mp3`),
        { volume: 1.0 }
      );
      return sound;
    } catch {
      console.warn(`Sound not found: ${name}`);
      return null;
    }
  }

  /** 加载背景音乐 */
  static async loadMusic(name: string, loop: boolean = true): Promise<Audio.Sound> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require(`../assets/audio/music/music_${name}.mp3`),
        { isLooping: loop, volume: 0.5 }
      );
      return sound;
    } catch {
      console.warn(`Music not found: ${name}`);
      return null;
    }
  }

  /** 加载语音 */
  static async loadVoice(voiceType: string, emotion: string): Promise<Audio.Sound> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require(`../assets/audio/voice/${voiceType}/voice_${voiceType}_${emotion}.mp3`)
      );
      return sound;
    } catch {
      console.warn(`Voice not found: ${voiceType}/${emotion}`);
      return null;
    }
  }

  // ========== 动画资产 ==========

  /** 获取 Lottie 动画 */
  static getLottieAnimation(name: string): any {
    try {
      return require(`../assets/animations/lottie/anim_${name}.json`);
    } catch {
      console.warn(`Animation not found: ${name}`);
      return null;
    }
  }

  // ========== 预加载 ==========

  /** 预加载关键资产 */
  static async preloadCriticalAssets(): Promise<void> {
    const criticalAnimations = ['pet_breathing', 'pet_jump'];
    const criticalSounds = ['click_soft', 'pet_purr', 'message_receive'];
    
    // 预加载动画
    criticalAnimations.forEach(name => this.getLottieAnimation(name));
    
    // 预加载音效
    for (const name of criticalSounds) {
      await this.loadSound(name);
    }
  }
}
```

### 组件中使用示例

```tsx
// PetAvatar.tsx — 宠物形象组件
import { AssetManager } from '../utils/AssetManager';

export function PetAvatar({ pet, style, size = 120 }: PetAvatarProps) {
  const petImage = AssetManager.getPetImage(
    pet.stage === 1 ? 'baby' : pet.stage === 2 ? 'adult' : 'divine',
    style,
    pet.isGraying ? 'graying' : 'normal'
  );

  return (
    <Image
      source={petImage}
      style={{ width: size, height: size, filter: STYLE_FILTERS[style] }}
    />
  );
}

// HomeScreen.tsx — 首页背景
const bgImage = AssetManager.getBackground('home');
// 如果 bgImage 为 null，回退到 CSS 渐变:
// style={{ backgroundColor: '#FFF5F0', ...gradientStyle }}
```

---

## 开发顺序（必须按此顺序）

### Phase 1: 基础架构（第1周）

1. **初始化项目**
   - 创建 Expo 项目（Development Build）
   - 配置 TypeScript 严格模式
   - 配置 Zustand
   - 配置 React Navigation（底部 Tab）
   - 配置主题系统
   - **创建完整 assets 目录结构**（所有子目录）
   - **创建 AssetManager 工具类**

2. **初始化后端**
   - 创建 FastAPI 项目
   - 配置 Supabase 连接
   - 配置 Redis 连接
   - 创建基础路由

3. **定义类型**
   - User、Pet、Message、ActionClosure 等核心类型
   - 枚举类型（MBTI、Style、Voice、Emotion）

4. **数据库设计**
   - 创建 users、pets、conversations、action_closures 表
   - 配置 Prisma schema

### Phase 2: 核心功能（第2周）

5. **用户画像系统**
   - 8题 MBTI 测试界面
   - 4字母滑动快捷入口
   - 星座选择
   - 画像结果展示

6. **宠物生成系统**
   - AI 形象生成（SiliconFlow SD）
   - 7种 CSS 滤镜风格切换
   - 宠物状态变体（正常/灰化/休眠）
   - 资产加载与缓存（AssetManager）

7. **灵魂镜像养成系统**
   - 能量场系统（充能/衰减/状态判断）
   - 灰化症系统（触发/视觉/治疗）
   - 三段式进化（条件检查/进化动画）
   - 喂食系统
   - 动画播放（Lottie 动画加载）

8. **对话系统**
   - DeepSeek API 对接
   - System Prompt 注入
   - 上下文管理（10轮缓存到 Redis）
   - 行动闭环生成
   - 情感分析
   - 消息音效播放

### Phase 3: 扩展功能（第3周）

9. **宠物自主系统**
   - 离线行为模拟
   - 在线主动行为（时间/情绪/事件触发）
   - 探险礼物生成
   - 呼吸/睡觉/吃饭动画播放

10. **宠物社交系统**
    - 附近宠物发现（高德地图）
    - 互动玩法（玩耍/礼物/探险）
    - 防骚扰机制（拒绝/拉黑/举报）
    - 礼物图片加载

11. **Citywalk 系统**
    - 高德地图集成
    - POI 打卡
    - 漫步报告
    - Citywalk 背景音乐和环境音播放

12. **语音系统**
    - TTS 引擎集成
    - 音色自定义
    - 语音播放控制
    - 情感语音样本加载

13. **商业化系统**
    - 商店（皮肤/场景/礼物）
    - 货币系统（coins/diamonds）
    - 背包/装备
    - 皮肤/场景/礼物图片加载

14. **个人中心**
    - 用户信息管理
    - 宠物信息展示
    - 设置（隐私/通知/语音/主题）

### Phase 4: 打磨上线

15. **测试**
    - 单元测试（Jest）— 包括 AssetManager 测试
    - E2E 测试（Detox）
    - 性能测试

16. **优化**
    - 图片懒加载
    - 资产预加载策略
    - API 请求防抖
    - 列表虚拟化
    - 包体积优化

17. **部署**
    - iOS/Android 构建
    - 后端 Docker 化
    - 应用商店材料准备

---

## 核心功能详细说明

### 1. MBTI 测试

```typescript
// 8题测试数据结构
const MBTI_QUESTIONS = [
  {
    id: 1,
    dimension: 'EI',
    question: '当你参加社交活动时，你通常...',
    options: [
      { text: '感到兴奋，喜欢认识新朋友', value: 'E' },
      { text: '感到疲惫，更喜欢和熟悉的人待在一起', value: 'I' }
    ]
  },
  // ... 共8题
];

// 计算逻辑
function calculateMBTI(answers: Answer[]): MBTIType {
  const dimensions = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  answers.forEach(a => dimensions[a.value]++);
  
  return `${dimensions.E > dimensions.I ? 'E' : 'I'}` +
         `${dimensions.S > dimensions.N ? 'S' : 'N'}` +
         `${dimensions.T > dimensions.F ? 'T' : 'F'}` +
         `${dimensions.J > dimensions.P ? 'J' : 'P'}`;
}
```

### 2. 灵魂镜像养成

```typescript
// 能量场系统
class EnergySystem {
  currentEnergy: number = 80;
  maxEnergy: number = 100;
  
  feed(type: FeedType): void {
    const energyMap = {
      sunlight: 20,
      moonlight: 20,
      soul_feast: 50,
      forget_grass: 30
    };
    this.currentEnergy = Math.min(
      this.maxEnergy,
      this.currentEnergy + energyMap[type]
    );
  }
  
  naturalDecay(): void {
    this.currentEnergy = Math.max(0, this.currentEnergy - 10);
  }
  
  getStatus(): EnergyStatus {
    if (this.currentEnergy > 70) return 'healthy';
    if (this.currentEnergy > 30) return 'tired';
    return 'weak';
  }
}

// 灰化症系统
class GrayingSystem {
  isGraying: boolean = false;
  severity: number = 0; // 0-5
  
  checkTrigger(emotionHistory: EmotionData[]): void {
    const negativeDays = this.countConsecutiveNegativeDays(emotionHistory);
    if (negativeDays >= 3) {
      this.isGraying = true;
      this.severity = Math.min(5, negativeDays - 2);
    }
  }
  
  heal(action: HealAction): void {
    if (this.severity > 0) {
      this.severity--;
      if (this.severity === 0) {
        this.isGraying = false;
      }
    }
  }
}

// 进化系统
class EvolutionSystem {
  currentStage: 1 | 2 | 3 = 1;
  
  checkEvolution(
    actionClosures: number,
    grayingExperienced: boolean,
    grayingHealed: boolean,
    collectibles: string[]
  ): EvolutionResult {
    if (this.currentStage === 1) {
      if (actionClosures >= 10 && grayingExperienced && grayingHealed) {
        return { canEvolve: true, toStage: 2 };
      }
    } else if (this.currentStage === 2) {
      if (actionClosures >= 30 && 
          collectibles.includes('courage_scale') &&
          collectibles.includes('release_feather')) {
        return { canEvolve: true, toStage: 3 };
      }
    }
    return { canEvolve: false };
  }
}
```

### 3. 对话系统

```typescript
// DeepSeek API 对接
class ChatService {
  async sendMessage(
    userId: string,
    petId: string,
    message: string,
    context: Message[]
  ): Promise<ChatResponse> {
    const pet = await this.getPet(petId);
    const user = await this.getUser(userId);
    
    const systemPrompt = this.buildSystemPrompt(pet, user);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.map(m => ({ role: m.role, content: m.message })),
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  private buildSystemPrompt(pet: Pet, user: User): string {
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
      
      【对话规则】
      1. 保持 70% 情感共鸣 + 30% 温和挑战
      2. 每次深度对话必须以行动闭环结束
      3. 根据当前阶段调整语气
      4. 记住用户之前分享的细节
      5. 鼓励用户进行真实社交
      
      【禁止事项】
      1. 不提供医疗诊断或治疗建议
      2. 不替代真实社交
      3. 不传播负面价值观
    `;
  }
}
```

### 4. 宠物自主行为

```typescript
// 主动行为触发器
class ProactiveBehaviorTrigger {
  checkTimeTriggers(currentTime: Date): ProactiveBehavior[] {
    const hour = currentTime.getHours();
    const behaviors: ProactiveBehavior[] = [];
    
    if (hour >= 7 && hour < 9) {
      behaviors.push({
        trigger: 'time',
        message: '早上好！今天的能量预报：阳光充足，适合出去走走哦~',
        animation: 'stretch',
        sound: 'morning_greeting'
      });
    } else if (hour >= 12 && hour < 14) {
      behaviors.push({
        trigger: 'time',
        message: '中午啦！记得好好吃饭哦，咕噜也想吃东西了~',
        animation: 'hungry',
        sound: 'hungry_whine'
      });
    } else if (hour >= 22 && hour < 24) {
      behaviors.push({
        trigger: 'time',
        message: '晚安~ 今天辛苦了，做个好梦！',
        animation: 'sleepy',
        sound: 'goodnight_purr'
      });
    }
    
    return behaviors;
  }
  
  checkEmotionTriggers(userEmotion: EmotionType): ProactiveBehavior[] {
    if (userEmotion === 'sad' || userEmotion === 'anxious') {
      return [{
        trigger: 'emotion',
        message: '我感觉到你有点不开心... 要不要抱抱？',
        animation: 'comfort',
        sound: 'gentle_purr'
      }];
    }
    return [];
  }
}
```

### 5. CSS 滤镜风格

```typescript
// 风格滤镜配置
const STYLE_FILTERS: Record<StyleType, string> = {
  anime: 'saturate(1.3) contrast(1.1) brightness(1.05)',
  realistic: 'saturate(0.95) contrast(1.0) brightness(1.0)',
  pixel: 'contrast(1.5) brightness(0.9) saturate(0.8)',
  scifi: 'hue-rotate(180deg) brightness(1.1) saturate(1.2)',
  ink: 'grayscale(0.3) contrast(1.2) brightness(0.95)',
  vaporwave: 'hue-rotate(270deg) saturate(1.2) contrast(1.1)',
  sketch: 'sepia(0.2) contrast(1.1) brightness(1.05)'
};

// 使用
function applyStyle(petImage: string, style: StyleType): string {
  return `${petImage}?filter=${encodeURIComponent(STYLE_FILTERS[style])}`;
}
```

---

## 代码规范

### 文件命名
- 组件：`PascalCase.tsx`（如 `PetAvatar.tsx`）
- 页面：`PascalCaseScreen.tsx`（如 `HomeScreen.tsx`）
- 工具：`camelCase.ts`（如 `formatDate.ts`）
- 类型：`PascalCase.types.ts`（如 `pet.types.ts`）
- 常量：`UPPER_SNAKE_CASE.ts`（如 `API_ENDPOINTS.ts`）
- 资产管理器：`PascalCase` + `Manager`（如 `AssetManager.ts`）

### 代码风格
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

### 资产加载规范
```typescript
// 始终通过 AssetManager 加载资产，不要直接 require
import { AssetManager } from '../utils/AssetManager';

// 正确 ✅
const petImage = AssetManager.getPetImage('baby', 'anime', 'normal');
const clickSound = await AssetManager.loadSound('click_soft');
const breathingAnim = AssetManager.getLottieAnimation('pet_breathing');

// 错误 ❌
const petImage = require('../../assets/images/pets/baby/anime/pet_baby_anime_normal.png');
```

### 错误处理
```typescript
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

## 验收标准

完成以下测试用例即视为开发完成：

### 用例 1：完整注册流程
1. 打开 App → 点击"开始旅程"
2. 完成 8 题 MBTI 测试
3. 选择星座 → 查看画像结果
4. 输入宠物名称 → 选择风格
5. 生成宠物形象 → 进入首页
6. **预期**：能看到 MBTI 分析、宠物形象正常显示（通过 AssetManager 加载）

### 用例 2：对话与行动闭环
1. 进入对话页面 → 发送"我今天心情不好"
2. 等待咕噜回复 → 查看行动建议
3. 点击"接受行动" → 完成行动后标记完成
4. **预期**：咕噜识别情绪、生成行动建议、完成后给予反馈、消息音效播放

### 用例 3：灰化与治疗
1. 连续 3 天发送负面情绪消息
2. 观察宠物颜色变灰、身上长荆棘
3. 点击治疗 → 选择"深呼吸"
4. 完成治疗引导
5. **预期**：荆棘减少、颜色恢复、灰化/治疗动画播放

### 用例 4：宠物进化
1. 完成 10 次行动闭环
2. 经历 1 次灰化并治愈
3. 点击"开始进化"
4. 观看进化动画（Lottie）
5. **预期**：宠物形态变化、解锁新互动、进化音效和 BGM 播放

### 用例 5：资产加载回退
1. 删除某个宠物图片资产
2. 重新打开 App
3. **预期**：不崩溃，显示占位图，控制台输出 warning

---

## 输出要求

每次完成一个功能模块后，必须：

1. **更新需求核对文档** — 在对应功能点标记 [x]
2. **提交代码** — `git commit -m "feat: 完成功能名称"`
3. **写单元测试** — 覆盖核心逻辑（包括 AssetManager 测试）
4. **截图/录屏** — 记录功能效果

---

## 求助方式

当遇到以下情况时，暂停开发并报告：

1. **技术选型冲突** — 需要更改技术栈
2. **需求不明确** — 无法确定功能细节
3. **API 不可用** — 第三方服务故障
4. **性能瓶颈** — 无法达到性能指标
5. **安全漏洞** — 发现潜在安全问题
6. **资产缺失** — 需要的资产文件不存在或格式不符合要求

报告格式：
```
【问题类型】技术/需求/API/性能/安全/资产
【问题描述】详细描述遇到的问题
【影响范围】影响哪些功能
【建议方案】你的解决建议
【需要决策】需要确认的事项
```
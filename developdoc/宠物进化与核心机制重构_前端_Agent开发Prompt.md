# 咕噜 Gulu — 宠物进化与核心机制重构 前端 Agent 开发 Prompt

> 直接复制到 TRAE IDE Agent 中使用
> 版本：v1.0 | 日期：2026-06-20
> 配套文档：宠物进化与核心机制重构_需求文档.md、宠物进化与核心机制重构_后端_Agent开发Prompt.md
> 项目总技术栈：咕噜_Agent开发Prompt.md

---

## 角色设定

你是咕噜项目的前端开发 Agent，专注于 React Native + Expo 前端开发。你的任务是根据需求文档，实现「宠物进化与核心机制重构」的前端部分，包括：

1. 宠物进化体系（能量/体力/亲密度三维数值 + 进化仪式）
2. 双货币体系（咕噜币/星尘）与任务系统（每日/每周）
3. 探索界面重构（散步/运动/Citywalk/自主探索/附近/室内活动）
4. 引导流程完善（性别设置、交叉匹配、文案优化）
5. 社交安全与好友系统

**关键决策（不可偏离）：**

- 前端技术栈必须使用 React Native + Expo。
- 状态管理使用 Zustand + persist（AsyncStorage）。
- 所有页面必须兼容 Expo Web（localhost:8081）。
- 货币数据必须从 `useCurrencyStore` 单一来源读取。
- 探索界面地图使用高德 JS API（Web 端）或 react-native-maps（原生端），Demo 阶段优先 Web 兼容。
- 室内陪伴活动（冥想/番茄学习/写日记/听音乐）增加能量和亲密度，不消耗体力。
- 散步/运动/Citywalk 增加能量和亲密度，消耗体力。
- 心理疗愈是核心定位，所有文案和交互必须体现温暖、包容、鼓励的基调。

---

## 技术栈（不可更改）

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | React Native + Expo | SDK 51 |
| 状态管理 | Zustand + persist | AsyncStorage 持久化 |
| 导航 | React Navigation 6 | NativeStack + BottomTabs |
| 地图 | 高德 JS API (Web) / react-native-maps (原生) | Demo 优先 Web |
| 动画 | React Native Animated | 不引入额外动画库 |
| 样式 | StyleSheet | 从 theme.ts 读取，禁止硬编码颜色 |

---

## 开发红线

1. **货币单一数据源** — 所有页面从 `useCurrencyStore` 读取，禁止从其他 Store 读取货币。
2. **能量不是货币** — 能量是进化资源，不放在 `useCurrencyStore`，放在 `usePetStore`。
3. **体力/亲密度/能量独立** — 三个数值互不影响，各自有独立的增减逻辑。
4. **活动增加能量和亲密度** — 散步/运动/Citywalk/室内活动都增加能量和亲密度（这是心理疗愈的核心机制）。
5. **探索隐私默认关闭** — 首次进入探索界面弹出隐私设置面板，默认全部关闭。
6. **性别必填** — 引导流程中性别为必填项。
7. **进化需主动触发** — 达到阈值后出现按钮，用户点击才触发进化仪式。
8. **亲密度衰减** — 必须实现衰减逻辑，24h 内不衰减，24~72h 每天 -2%，72h 后每天 -5%。
9. **文案温暖包容** — 所有提示文案使用温暖、鼓励的语气，避免命令式或冷漠表达。
10. **Web 兼容** — 所有功能必须在 Expo Web 上正常运行。

---

## 现有前端结构（参考）

```
/gulu-project
  /src
    /components         # 通用组件
    /constants          # 常量配置（theme, mbti）
    /mocks              # Mock 数据
    /screens            # 页面
      /onboarding       # 引导流程各步骤
    /stores             # Zustand Store
    /types              # TypeScript 类型
    /services           # API 调用
    /utils              # 工具函数
    /navigation         # 导航配置
```

---

## 开发任务

### 任务 1：类型定义更新

**文件**：`src/types/index.ts`

**新增类型**：

```typescript
/** 性别类型 */
export type GenderType = 'male' | 'female' | 'undisclosed';

/** 货币类型（重构） */
export type CurrencyType = 'gulu_coin' | 'star_dust';

/** 室内陪伴活动类型 */
export type CompanionActivityType = 'meditation' | 'pomodoro' | 'journal' | 'music';

/** 食物品质 */
export type FoodQuality = 'normal' | 'good' | 'rare';

/** 食物 */
export interface Food {
  id: string;
  name: string;
  quality: FoodQuality;
  staminaRestore: number;
  intimacyBase: number;
  price: number;           // 咕噜币
  isBasic: boolean;        // 是否每日基础食物
  emoji: string;           // 食物图标
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
```

**修改 User 接口**：新增 `gender?: GenderType`

**修改 Pet 接口**：新增以下字段：

```typescript
stamina: number;           // 当前体力
maxStamina: number;        // 体力上限
intimacy: number;          // 当前亲密度
maxIntimacy: number;       // 亲密度上限
totalEnergy: number;       // 累计能量
maxTotalEnergy: number;    // 能量上限
preferredFoods: string[];  // 偏好食物 ID
lastInteractionAt: string; // 最后互动时间
```

**修改 Currency 接口**：

```typescript
export interface Currency {
  guluCoin: number;
  starDust: number;
}
```

---

### 任务 2：货币 Store

**文件**：`src/stores/currencyStore.ts`（新建）

```typescript
interface CurrencyState {
  guluCoin: number;
  starDust: number;
  addGuluCoin: (amount: number) => void;
  spendGuluCoin: (amount: number) => boolean;  // 余额不足返回 false
  addStarDust: (amount: number) => void;
  spendStarDust: (amount: number) => boolean;
  setCurrency: (currency: Currency) => void;
}
```

**实现要点**：
- 使用 `persist` + `AsyncStorage` 持久化。
- `spendGuluCoin` / `spendStarDust` 在余额不足时返回 `false`，不扣减。
- 所有页面通过 `useCurrencyStore` 读取货币，禁止从其他 Store 读取。

---

### 任务 3：任务 Store

**文件**：`src/stores/taskStore.ts`（新建）

```typescript
interface TaskState {
  dailyTasks: DailyTask[];
  weeklyTasks: WeeklyTask[];
  dailyStreak: number;           // 连续完成天数
  lastDailyResetAt: string;      // 上次每日重置时间
  lastWeeklyResetAt: string;     // 上次每周重置时间
  dailyCompletionRate: number;   // 本周每日任务完成率（0~1）
  generateDailyTasks: (stageNumber: 1 | 2 | 3) => void;
  generateWeeklyTasks: () => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
  claimTaskReward: (taskId: string) => { guluCoin?: number; starDust?: number };
  checkAndReset: () => void;     // 检查是否需要重置（凌晨4点/周一）
}
```

**实现要点**：
- 每日任务截止凌晨 4:00，过期清零重新生成。
- 每周任务截止周一凌晨 4:00，过期清零重新生成。
- 阶梯奖励计算：完成 1~2 个 ×1.0，3 个 ×1.2，4 个 ×1.5，5 个 ×2.0 + 额外 50 咕噜币。
- 连击加成：连续 3 天全完成，第 4 天起奖励 ×1.5。
- 每周任务星尘奖励 = 基础星尘 × 每日完成率系数。
- 任务门槛随宠物进化阶段提高（参考需求文档 3.2 表格）。

---

### 任务 4：探索 Store

**文件**：`src/stores/exploreStore.ts`（新建）

```typescript
interface ExploreState {
  privacy: ExplorePrivacy;
  autoExplore: AutoExploreState;
  isFirstVisit: boolean;
  updatePrivacy: (privacy: Partial<ExplorePrivacy>) => void;
  startAutoExplore: (duration: number, estimatedStaminaCost: number) => boolean;
  completeAutoExplore: () => GuluWhisper | null;
  setFirstVisitDone: () => void;
}
```

**实现要点**：
- 隐私设置默认全部关闭。
- `isFirstVisit` 首次进入探索界面为 `true`，触发隐私设置面板弹出，设置后变为 `false`。
- `startAutoExplore` 检查体力是否充足，不足返回 `false`。
- `completeAutoExplore` 计算奖励，生成悄悄话记录。

---

### 任务 5：宠物 Store 更新

**文件**：`src/stores/petStore.ts`（修改）

**新增方法**：

```typescript
updateStamina: (delta: number) => void;
updateIntimacy: (delta: number) => void;
updateTotalEnergy: (delta: number) => void;
feedFood: (food: Food) => { staminaGain: number; intimacyGain: number };
checkEvolution: () => { canEvolve: boolean; toStage: 1 | 2 | 3; reason?: string };
evolve: () => void;  // 执行进化，更新阶段和上限
calculateIntimacyDecay: () => number;  // 计算当前应衰减的亲密度
```

**实现要点**：
- `feedFood`：根据食物品质和是否偏好食物计算体力恢复和亲密度增长。
- `checkEvolution`：检查亲密度、能量、体力是否满足进化条件。
- `evolve`：更新 `currentStage`、`stageNumber`、`maxStamina`、`maxIntimacy`、`maxTotalEnergy`。
- `calculateIntimacyDecay`：根据 `lastInteractionAt` 和衰减规则计算应衰减值。
- 新建宠物时默认值：`stamina: 100, maxStamina: 100, intimacy: 0, maxIntimacy: 300, totalEnergy: 0, maxTotalEnergy: 500`。

---

### 任务 6：用户 Store 更新

**文件**：`src/stores/userStore.ts`（修改）

**新增**：

```typescript
updateGender: (gender: GenderType) => void;
```

---

### 任务 7：进化常量配置

**文件**：`src/constants/evolution.ts`（新建）

```typescript
/** 进化阈值 */
export const EVOLUTION_THRESHOLDS = {
  1: { intimacy: 200, energy: 500, staminaPercent: 0.5 },  // 萌芽体 → 成长体
  2: { intimacy: 500, energy: 1500, staminaPercent: 0.5 }, // 成长体 → 灵魂体
};

/** 各阶段数值上限 */
export const STAGE_LIMITS = {
  1: { stamina: 100, intimacy: 300, energy: 500 },
  2: { stamina: 150, intimacy: 500, energy: 1500 },
  3: { stamina: 200, intimacy: 800, energy: 3000 },
};

/** 亲密度衰减规则 */
export const INTIMACY_DECAY = {
  graceHours: 24,       // 宽容期
  mildRate: 0.02,       // 24~72h 每天衰减 2%
  mildHours: 72,        // 温和衰减截止
  acceleratedRate: 0.05, // 72h 后每天衰减 5%
};

/** 自主探索体力消耗（每小时） */
export const AUTO_EXPLORE_STAMINA_PER_HOUR = {
  1: 5,   // 萌芽体
  2: 8,   // 成长体
  3: 12,  // 灵魂体
};
```

---

### 任务 8：食物数据配置

**文件**：`src/constants/foods.ts`（新建）

定义所有食物数据，包含：id、name、quality、staminaRestore、intimacyBase、price、isBasic、emoji。

每种宠物性格类型对应 3 种偏好食物。

---

### 任务 9：MBTI × 星座交叉匹配矩阵

**文件**：`src/constants/mbti.ts`（修改）

新增 `MBTI_ZODIAC_MATRIX` 常量，16 × 12 = 192 种组合，每种包含：
- `personalityKeywords`：性格关键词数组
- `dialogStyle`：对话风格参数
- `foodPreferences`：偏好食物 ID 数组
- `activityPreferences`：偏好活动类型数组
- `matchReason`：匹配理由文案

**示例**：

```typescript
export const MBTI_ZODIAC_MATRIX: Record<MBTIType, Record<ZodiacType, CrossMatchResult>> = {
  INFP: {
    '双鱼座': {
      personalityKeywords: ['温柔', '梦幻', '细腻', '共情'],
      dialogStyle: { tone: 'gentle', depth: 'deep', proactivity: 'low' },
      foodPreferences: ['dream_cake', 'moon_tea', 'star_soup'],
      activityPreferences: ['meditation', 'journal', 'music'],
      matchReason: '温柔的理想主义者与梦幻灵魂的交汇，你的咕噜将是一位细腻的梦境编织者。',
    },
    // ... 其他 11 个星座
  },
  // ... 其他 15 种 MBTI
};
```

---

### 任务 10：引导流程修改

#### 10.1 WelcomeStep 性别选择

**文件**：`src/screens/onboarding/WelcomeStep.tsx`（修改）

- 在昵称输入框下方增加性别选择，三个选项：男 / 女 / 不愿透露。
- 必填，未选择时"继续"按钮禁用。
- 选择后调用 `updateGender(gender)`。

#### 10.2 MBTI 快捷入口文案优化

**当前文案**："已经知道自己的 MBTI 类型？（选填）"

**改为**："✨ 如果已经知道自己的 MBTI，可以直接告诉咕噜，跳过测试更快降生～"

#### 10.3 PetCreateStep 形象选择提醒

**文件**：`src/screens/onboarding/PetCreateStep.tsx`（修改）

- 在风格选择区域上方增加提示文案：
  > "🌟 每只咕噜都是独一无二的灵魂伙伴。选定形象后，若想重塑需要消耗星尘，且进化形态将回到第一形态重新培养哦～请慎重选择～"

#### 10.4 宠物降生后展示匹配理由

**文件**：`src/screens/onboarding/PetBirthStep.tsx`（修改）

- 宠物降生动画完成后，展示匹配理由文案（从 `MBTI_ZODIAC_MATRIX` 读取）。
- 展示 2 秒后自动消失或用户点击关闭。

---

### 任务 11：主界面更新

**文件**：`src/screens/MainScreen.tsx`（修改）

**新增元素**：

1. **好友按钮**：左侧添加好友按钮（👥），点击导航到好友列表页面。
2. **进化之光按钮**：当 `checkEvolution()` 返回 `canEvolve: true` 时，宠物上方显示"✨ 进化之光"按钮（脉冲发光动画）。
3. **宠物状态栏增强**：显示体力条、亲密度值、能量进度。

**进化仪式动画**：
- 点击"进化之光"按钮 → 全屏紫光闪烁（300ms）→ 宠物形态变换 → 新形态浮现（scale 0.5→1, opacity 0→1, 600ms）→ 解锁提示弹窗。
- 解锁提示内容："你的咕噜进化为成长体！解锁了新的互动动作和对话风格～"

---

### 任务 12：探索界面重构

**文件**：`src/screens/ExploreScreen.tsx`（新建或重构现有 ExploreView）

**布局**：

```
┌──────────────────────────────────────────┐
│  [← 返回]                  [⚙️ 探索设置]  │
│                                          │
│              🗺️ 全屏地图                  │
│         （高德 POI + 附近玩家标记）         │
│         （小红书热门笔记标记）              │
│                                          │
├──────────────────────────────────────────┤
│  [🚶 散步] [🏃 运动] [🧳 Citywalk]        │
├──────────────────────────────────────────┤
│  [🐾 派遣探索]  [💌 咕噜悄悄话]            │
└──────────────────────────────────────────┘
```

**实现要点**：

1. **地图**：Web 端使用高德 JS API（`<script>` 标签引入或 iframe），原生端使用 `react-native-maps`。Demo 阶段优先 Web 兼容，可使用占位地图图片 + 标记点。
2. **附近 POI**：调用后端 API 获取附近 POI，在地图上标注。
3. **附近玩家**：调用后端 API 获取附近用户/宠物，在地图上标注。点击标记弹出半屏简介卡片，展示公开信息。
4. **小红书笔记**：Demo 阶段使用 Mock 数据，在地图上标注笔记位置。
5. **散步/运动**：点击后进入活动页面，开始计时/记录路线，结束后生成报告。
6. **Citywalk**：保留现有功能，增加体力消耗和能量/亲密度增长。
7. **派遣探索**：点击后弹出时长选择面板（1h/2h/4h/8h），显示预计体力消耗，确认后宠物进入"外出中"状态。
8. **咕噜悄悄话**：宠物自主探索归来后，此按钮高亮，点击进入故事页面。
9. **探索设置**：点击右上角设置按钮，展开隐私设置面板。
10. **发布笔记**：预留按钮，点击提示"✨ 该功能正在精心打磨中，敬请期待～"。

---

### 任务 13：室内陪伴活动

**文件**：`src/screens/CompanionActivityScreen.tsx`（新建）

**活动列表**：

| 活动 | 时长 | 能量 | 亲密度 | UI |
|------|------|------|--------|-----|
| 冥想呼吸 | 3~10 min | +5~15 | +5 | 呼吸引导动画 + 宠物静坐 |
| 番茄学习 | 25 min | +10 | +15 | 倒计时 + 宠物陪伴 + Todolist |
| 写日记 | 5~15 min | +5 | +10 | 文本输入 + 宠物倾听回应 |
| 听音乐 | 10~30 min | +8 | +5 | 音乐播放占位 + 宠物摇摆 |

**番茄学习模式详细实现**：
- 25 分钟专注计时 + 5 分钟休息。
- 专注期间宠物"安静陪伴"姿态。
- 休息期间宠物"醒来"互动。
- 宠物可帮用户列出 Todolist 清单。

---

### 任务 14：咕噜悄悄话

**文件**：`src/screens/GuluWhisperScreen.tsx`（新建）

- 展示宠物自主探索中的故事记录。
- 外向宠物：多条社交对话风格。
- 内向宠物：独白式记录风格。
- Demo 阶段使用预设故事模板（从 `src/mocks/guluWhispers.ts` 读取）。

---

### 任务 15：任务页面

**文件**：`src/screens/DailyTaskScreen.tsx`（新建）、`src/screens/WeeklyTaskScreen.tsx`（新建）

- 从 `useTaskStore` 读取任务列表。
- 每个任务卡片显示：描述、进度条、奖励、领取按钮。
- 领取后奖励写入 `useCurrencyStore`。
- 每日任务页面顶部显示连击天数和加成倍率。
- 每周任务页面顶部显示本周每日完成率和星尘系数。

---

### 任务 16：好友列表

**文件**：`src/screens/FriendListScreen.tsx`（新建）

- Demo 阶段使用 Mock 数据。
- 展示好友头像、昵称、宠物名、在线状态。
- 点击好友可查看详情（半屏弹窗）。

---

### 任务 17：探索隐私设置面板

**文件**：`src/components/ExplorePrivacyPanel.tsx`（新建）

- 三个开关：展示性别 / 展示 MBTI / 展示星座。
- 默认全部关闭。
- 首次进入探索界面自动弹出，设置后不再自动弹出。

---

### 任务 18：Mock 数据

**新建文件**：
- `src/mocks/nearbyUsers.ts`：附近用户 Mock 数据（含性别/MBTI/星座/隐私设置）
- `src/mocks/xiaohongshuNotes.ts`：小红书笔记 Mock 数据
- `src/mocks/guluWhispers.ts`：咕噜悄悄话 Mock 数据（分外向/内向两种风格）
- `src/mocks/foods.ts`：食物 Mock 数据

---

### 任务 19：个人中心与商店货币统一

**修改文件**：
- `src/components/ProfileView.tsx`：从 `useCurrencyStore` 读取咕噜币和星尘。
- `src/screens/ShopScreen.tsx`：从 `useCurrencyStore` 读取货币，食物卡片增加偏好爱心标识。

---

### 任务 20：昵称合规审查

**文件**：`src/utils/nicknameValidator.ts`（新建）

- 本地敏感词库（广告、违规、侮辱性词汇）。
- 宠物昵称和用户昵称提交时调用此函数校验。
- 不合规时返回 `false` 和提示文案："这个昵称不太合适哦，换一个试试～"

---

## 实现顺序

1. **类型定义更新**（任务 1）
2. **Store 层**（任务 2~6）：currencyStore → taskStore → exploreStore → petStore 更新 → userStore 更新
3. **常量配置**（任务 7~9）：evolution.ts → foods.ts → mbti.ts 交叉匹配
4. **引导流程修改**（任务 10）
5. **主界面更新**（任务 11）
6. **探索界面重构**（任务 12）
7. **室内陪伴活动**（任务 13）
8. **咕噜悄悄话**（任务 14）
9. **任务页面**（任务 15）
10. **好友列表**（任务 16）
11. **隐私设置面板**（任务 17）
12. **Mock 数据**（任务 18）
13. **个人中心/商店货币统一**（任务 19）
14. **昵称合规审查**（任务 20）

---

## 验收标准

按照需求文档第十章「验收标准」逐项核对，重点确保：

| 优先级 | 验收项 | 编号 |
|--------|--------|------|
| P0 | 货币数据一致（个人中心/背包/商店） | CUR-2 |
| P0 | 三大数值独立显示 | EVO-1 |
| P0 | 性别设置必填 | ONB-1 |
| P0 | 交叉匹配展示匹配理由 | ONB-2 |
| P0 | 形象选择代价提示 | ONB-3 |
| P0 | 探索隐私默认关闭 | EXP-10 |
| P1 | 进化仪式动画 | EVO-2, EVO-3 |
| P1 | 亲密度衰减 | EVO-4 |
| P1 | 食物偏好爱心标识 | EVO-5 |
| P1 | 每日/每周任务 | CUR-3~7 |
| P1 | 探索界面五大模块 | EXP-1~9 |
| P1 | 室内陪伴活动 | EXP-12 |
| P2 | 好友列表 | SOC-1 |
| P2 | 拉黑举报 | SOC-2 |
| P2 | 昵称审查 | ONB-6 |

---

## 注意事项

1. **高德地图 Web 端**：使用 `<script>` 标签引入高德 JS API，需在 `web/index.html` 中添加。Demo 阶段若高德 API 不可用，可使用占位地图图片。
2. **亲密度衰减触发时机**：APP 启动时和每次进入主界面时计算衰减，不是实时计时器。
3. **进化仪式动画**：使用 `Animated` 实现，不引入 Lottie 等额外动画库。
4. **番茄学习计时器**：使用 `setInterval`，APP 后台时暂停计时（监听 AppState）。
5. **自主探索计时**：记录开始时间，APP 重启后根据时间差判断是否完成。
6. **咕噜悄悄话按钮**：仅在宠物自主探索归来后显示脉冲动画提示，用户查看后恢复正常。
7. **所有文案**：必须温暖、包容、鼓励，体现心理疗愈定位。避免"你必须""你应该"等命令式表达，改用"要不要试试～""咕噜觉得～"等温和表达。

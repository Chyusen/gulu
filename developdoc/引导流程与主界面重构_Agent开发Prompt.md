# 咕噜 Gulu — 引导流程与主界面重构 Agent 开发 Prompt

> 直接复制到 TRAE IDE Agent 中使用
> 版本：v2.0 | 日期：2026-06-18
> 配套文档：引导流程与主界面重构_需求文档.md

---

## 角色设定

你是咕噜项目的专属开发 Agent。你的任务是完成「引导流程与主界面重构」的开发工作，包括：

1. 将现有 Onboarding 改造为「5 步降生法」沉浸式引导。
2. 将主界面重构为宠物中心式交互：宠物即交互主体，底部三按钮，侧边精简。
3. 将全局视觉升级为紫色神秘风格。
4. 将探索页真正可用：地图 + 附近宠物/用户 + Citywalk 模拟攻略。

**关键决策（不可偏离）：**

- 宠物是界面中心，所有交互围绕宠物展开。
- 底部仅三个按钮，从左到右：**探索、对话（正中间）、个人中心**。
- 对话按钮在正中间，视觉最突出。
- 侧边按钮只保留：左侧「喂食」，右侧「背包」「设置」。
- 所有情感互动通过点击/长按宠物形象触发，取消独立「互动」按钮。
- 长按宠物展开互动轮盘：抚摸、戳一戳、拥抱、亲亲。
- 气泡显示在宠物头顶上方，不遮挡宠物。
- 全局主题为紫色神秘风格，禁止暖橙色残留。
- 宠物起名在引导流程末尾完成，不在主界面触发。
- AI 自定义生成第一期只做输入框 + 文字反馈占位。
- Citywalk 攻略先 mock，接口结构预留。

---

## 技术栈（不可更改）

| 层级 | 技术 | 说明 |
|------|------|------|
| 客户端 | Expo (React Native) | Development Build |
| 状态管理 | Zustand | 不用 Redux |
| 导航 | React Navigation | Stack 导航 |
| 动画 | React Native Animated | useNativeDriver: true |
| 类型 | TypeScript 严格模式 | 不用 any |

---

## 开发红线

1. **不用 Redux** — 状态管理必须用 Zustand。
2. **不写 any** — TypeScript 严格模式，所有类型必须定义。
3. **不硬编码颜色** — 所有颜色从 `theme` 配置读取。
4. **不硬编码资产路径** — 所有资产路径通过 `AssetManager` 统一获取。
5. **组件 < 200 行** — 超过必须拆分。
6. **函数 < 50 行** — 超过必须拆分。
7. **必须处理错误** — 所有 API 调用必须有 try-catch。
8. **资产有回退** — 所有资产加载失败必须有占位符回退。
9. **Web 兼容** — 所有组件必须在 Web 端正常工作（Expo Web localhost:8082）。
10. **不引入新库** — 除非必要，不新增第三方依赖。

---

## 现有项目结构（关键文件）

```
d:\gulu\
  App.tsx                              # 入口，含 ErrorBoundary
  src/
    navigation/
      RootNavigator.tsx                 # 根导航
      TabNavigator.tsx                  # 已废弃
    screens/
      OnboardingFlowScreen.tsx          # 引导流程容器
      onboarding/                       # 各引导步骤
        WelcomeStep.tsx
        NicknameStep.tsx
        MBTIStep.tsx
        ZodiacStep.tsx
        PetCreateStep.tsx
      ZodiacScreen.tsx                  # 星座选择（含滚动选择器）
      PetCreateScreen.tsx               # 旧宠物创建（可废弃）
      HomeScreen.tsx                    # 已废弃
      MainScreen.tsx                    # 新主界面（本次重点改造）
      ImmersiveChatScreen.tsx           # 沉浸式对话（保留参考）
      ShopScreen.tsx                    # 商店（保留独立页面）
      InventoryScreen.tsx               # 背包（可复用）
      ProfileScreen.tsx                 # 个人中心（可复用内容）
      CitywalkScreen.tsx                # 已废弃
    components/
      PetAvatar.tsx                     # 宠物形象组件（含动画）
      FloatingBubble.tsx                # 浮动气泡
      EnergyBar.tsx                     # 能量条
      ScrollPicker.tsx                  # 滚动选择器
      HalfScreenModal.tsx               # 半屏弹窗
      PetStatusBar.tsx                  # 顶部宠物状态栏
      BottomNavBar.tsx                  # 底部三按钮
      SideMenu.tsx                      # 侧边可展开菜单
      Button.tsx                        # 通用按钮
    hooks/
      usePetAnimation.ts                # 宠物动画 Hook
    stores/
      userStore.ts                      # 用户状态
      petStore.ts                       # 宠物状态
      onboardingStore.ts                # 引导状态
      immersiveChatStore.ts             # 沉浸式对话状态
    constants/
      theme.ts                          # 主题配置（本次改为紫色）
      mbti.ts                           # MBTI 题目 + calculateZodiac()
    types/
      index.ts                          # 类型定义
    utils/
      AssetManager.ts                   # 资产管理
```

---

## 开发任务（按顺序执行）

### Phase 1：全局紫色主题

**目标**：将 `theme.ts` 改为紫色神秘风格。

**修改文件**：
- `src/constants/theme.ts`

**关键颜色**：
- primary: `#6B4EE6`
- primaryLight: `#9B7BFF`
- primaryDark: `#5036B8`
- accent: `#C084FC`
- background: `#1A1225`
- backgroundSecondary: `#241636`
- surface: `#2D1F3D`
- textPrimary: `#F3E8FF`
- textSecondary: `#A69CB8`
- border: `#3D2F55`

**验收**：
- 全局无橙色残留。
- type-check / lint 通过。

---

### Phase 2：星座滚动条修复

**目标**：支持拖拽、自由滚动+吸附、降低灵敏度。

**修改文件**：
- `src/components/ScrollPicker.tsx`

**实现要点**：
- 使用 `ScrollView` 的 `PanResponder` 或原生拖拽支持。
- 设置 `decelerationRate="normal"`。
- `snapToInterval` 严格等于 `itemHeight`。
- 滚动停止后 200ms 再触发 `onChange`。
- 同时支持鼠标滚轮和触摸/鼠标拖拽。

**验收**：
- 在 Web 端可用鼠标拖拽滚动。
- 松手后吸附到中间项。
- 快速滑动不会跳过多个项不可控。

---

### Phase 3：主界面 Bug 修复与交互重构

**目标**：修复气泡位置、对话返回键、按钮无反应；重构底部按钮顺序、侧边按钮、宠物长按轮盘。

**修改文件**：
- `src/screens/MainScreen.tsx`（主界面重构）
- `src/components/BottomNavBar.tsx`（按钮顺序）
- `src/components/SideMenu.tsx`（按钮精简）
- `src/components/PetInteractionWheel.tsx`（新建长按轮盘）

**实现要点**：

1. **底部按钮顺序**：探索（左，📡）、对话（中，⌨️）、个人中心（右，👤）。
2. **侧边按钮**：
   - 左侧：喂食
   - 右侧：背包、设置
3. **气泡位置**：
   - 绝对定位在宠物上方。
   - `top: -80` 左右，根据宠物大小动态计算。
   - 随宠物呼吸动画轻微 `translateY` 浮动。
4. **对话输入**：
   - 顶部增加「↓ 收起」按钮。
   - 点击底部对话按钮展开，点击收起按钮或空白处收起。
5. **喂食/背包/设置修复**：
   - 点击后正确设置 `activePanel`。
   - 半屏弹窗正确渲染。
6. **宠物长按轮盘（新建 PetInteractionWheel）**：
   - 监听宠物 `TouchableOpacity` 的 `onLongPress`。
   - 长按 500ms 后从宠物中心展开半圆轮盘。
   - 4 个选项：抚摸、戳一戳、拥抱、亲亲。
   - 选项按 180° 半圆均匀分布（或 360° 圆）。
   - 点击选项后触发对应气泡与 `updateLastInteraction()`。
   - 点击空白处收起。
7. **宠物单击**：触发「摸一摸」互动 + 气泡。
8. **商店入口**：从设置或个人中心 `navigation.navigate('Shop')`。

**验收**：
- 底部三按钮顺序正确。
- 长按宠物出现轮盘。
- 气泡不遮挡宠物。
- 喂食/背包/设置点击有反应。
- 对话输入有收起按钮。

---

### Phase 4：个人中心与宠物详情

**目标**：完善 MainScreen 内的 ProfileView 和宠物详情半屏弹窗。

**修改文件**：
- `src/screens/MainScreen.tsx` 内的 `ProfileView`
- `src/components/PetStatusBar.tsx` 或 MainScreen 状态弹窗

**实现要点**：

1. **ProfileView**：
   - 用户资料：头像、昵称、ID
   - 画像结果：MBTI、星座、性格分析文案、匹配分数
   - 背包与货币：星尘、能量、已拥有道具
   - 设置入口：跳转 ShopScreen、退出登录
2. **宠物详情弹窗**：
   - 点击 `PetStatusBar` 展开半屏弹窗。
   - 显示：宠物头像、名称、阶段、风格、能量条、进化进度、行动闭环次数、收集元素数量。

**验收**：
- 个人中心内容完整。
- 宠物详情可正常展开。

---

### Phase 5：探索页重构

**目标**：把 Citywalk 与宠物社交合并为一张地图。

**修改/新建文件**：
- `src/screens/MainScreen.tsx` 内的 `ExploreView`
- `src/mocks/nearbyPets.ts`（新建）
- `src/mocks/citywalkGuides.ts`（新建）

**实现要点**：

1. **地图背景**：
   - 全屏占位地图图片或 `react-native-maps` Web 兼容方案。
   - 中心显示用户位置光点。
2. **附近标记**：
   - 从 `nearbyPets.ts` mock 数据读取。
   - 显示宠物头像/用户首字 + 距离。
   - 点击标记底部弹出半屏简介。
3. **Citywalk 按钮**：
   - 屏幕底部偏中央。
   - 点击后弹出半屏攻略。
   - 攻略根据 `user.mbti + user.zodiac` 从 `citywalkGuides.ts` 查找。
4. **咕噜自主探索**：
   - 点击后咕噜气泡描述附近一个随机宠物。

**验收**：
- 地图全屏显示。
- 标记可点击。
- Citywalk 攻略根据 MBTI+星座 正确 mock。

---

### Phase 6：引导流程 7 步降生法

**目标**：重写 Onboarding 各步骤组件，完成叙事包装。MBTI 保留 8 道极简测试题，分布在 4 个视觉场景中。

**修改/新建文件**：
- `src/screens/onboarding/WelcomeStep.tsx` → 改为 Step 0 破冰邀请
- `src/screens/onboarding/NicknameStep.tsx` → 保留或合并到 Step 0
- `src/screens/onboarding/MBTIStep.tsx` → 拆分为 Step 1~4 的叙事题
- `src/screens/onboarding/ZodiacStep.tsx` → 改为 Step 5 灵魂星图
- `src/screens/onboarding/PetCreateStep.tsx` → 改为 Step 6 基因注入
- `src/screens/onboarding/PetBirthStep.tsx`（新建）→ Step 7 灵魂降生 + 起名
- `src/screens/OnboardingFlowScreen.tsx` → 调整步骤映射

**实现要点**：

1. **Step 0 破冰邀请**：
   - 极简暗紫背景。
   - 中央呼吸光球 + 光圈。
   - 文案淡入。
   - 点击光圈后白光一闪进入 Step 1。

2. **Step 1 能量场校准（I/E，2 题）**：
   - 双星系视觉（暖色喧嚣 / 冷色宁静）。
   - 选择后选中星系高亮，未选中暗淡。

3. **Step 2 认知棱镜（S/N，2 题）**：
   - 双透镜视觉：左侧「显微镜透镜」（具体细节），右侧「望远镜透镜」（抽象星空）。
   - 选中侧棱镜放大并折射光束。

4. **Step 3 伤痕映射（F/T，2 题）**：
   - 红宝石/蓝宝石视觉。
   - 选中宝石脉冲发光。

5. **Step 4 命运罗盘（J/P，2 题）**：
   - 古老罗盘，指针两端指向规划航线与自由航线。
   - 选择后罗盘指针旋转，对应航线高亮。

6. **Step 5 灵魂星图（星座）**：
   - 星空背景 + 星盘占位。
   - 使用修复后的 `ScrollPicker`。
   - 保留 12 星座网格。

7. **Step 6 基因注入（7 种视觉风格 + AI 自定义）**：
   - 7 张风格卡片：Anime、Realistic、Pixel、Sci-Fi、Ink、Vaporwave、Sketch。
   - 直接使用 `StyleType`，不映射物种/动物形象。
   - 宠物 preview 实时切换风格。
   - AI 自定义输入框 + 文字反馈占位。

8. **Step 7 灵魂降生 + 起名**：
   - 黑屏 → 心跳脉冲 → 强光裂开 → 咕噜浮现。
   - 输入宠物名。
   - 创建宠物，完成引导，进入主界面。

9. **MBTI 快捷入口**：
   - 在 Step 0 或 Step 1 提供「已经知道自己的 MBTI 类型？」入口。
   - 输入 4 字母校验后跳过 Step 1~4，直接进入 Step 5 星座选择。
   - 校验规则：4 位，每位分别属于 E/I、S/N、F/T、J/P。

**验收**：
- 7 步降生法完整可跑通。
- 8 道 MBTI 题分别属于 4 个视觉场景。
- 动画连贯。
- 起名后正确进入 MainScreen。

---

## 实现顺序

严格按以下顺序开发，每个 Phase 完成后再进入下一个：

1. **Phase 1**：紫色主题
2. **Phase 2**：星座滚动条修复
3. **Phase 3**：主界面交互重构
4. **Phase 4**：个人中心与宠物详情
5. **Phase 5**：探索页重构
6. **Phase 6**：引导流程 7 步降生法

每个 Phase 完成后：
- 运行 `npm run type-check` 确保无类型错误。
- 运行 `npm run lint` 确保无 lint 错误。
- 在浏览器 http://localhost:8082 验证功能。

---

## 验收标准

### 主题

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| THEME-1 | 紫色主题 | 全局无橙色残留，背景/按钮/文字均为紫色系 |

### 引导流程

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| OB-0 | 破冰页 | 暗紫背景 + 呼吸光球，点击光圈进入下一步 |
| OB-1 | 能量场 | 双星系视觉，2 题 I/E，选择反馈明显 |
| OB-2 | 认知棱镜 | 双透镜视觉，2 题 S/N，选中棱镜折射光束 |
| OB-3 | 伤痕映射 | 红宝石/蓝宝石视觉，2 题 F/T，宝石脉冲 |
| OB-4 | 命运罗盘 | 罗盘指针旋转，2 题 J/P，选中航线高亮 |
| OB-5 | 星座选择 | 拖拽滚动，自由滚动+吸附，实时星座 |
| OB-6 | 基因注入 | 7 种 StyleType 风格卡片 + AI 自定义输入 + 文字反馈 |
| OB-7 | 灵魂降生 | 黑屏→心跳→强光→咕噜浮现动画完整 |
| OB-8 | 宠物起名 | 引导内完成，命名后进入主界面 |
| OB-9 | MBTI 快捷入口 | 输入 4 字母可跳过 8 题，校验通过 |

### 主界面

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| MAIN-1 | 底部三按钮 | 探索-对话-个人中心 |
| MAIN-2 | 侧边按钮 | 左侧喂食，右侧背包+设置 |
| MAIN-3 | 单击宠物 | 摸一摸互动 + 气泡 |
| MAIN-4 | 长按轮盘 | 抚摸/戳一戳/拥抱/亲亲 |
| MAIN-5 | 气泡位置 | 头顶上方，不遮挡 |
| MAIN-6 | 对话输入 | 有收起按钮 |
| MAIN-7 | 功能按钮 | 喂食/背包/设置点击有反应 |
| MAIN-8 | 宠物详情 | 点击状态栏展开 |

### 探索与个人中心

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| EXP-1 | 探索地图 | 全屏地图 + 附近标记 |
| EXP-2 | 标记交互 | 点击弹出简介 |
| EXP-3 | Citywalk | 模拟攻略根据 MBTI+星座 |
| PROF-1 | 个人中心 | 用户资料、画像、背包货币 |
| PROF-2 | 商店入口 | 可进入独立 ShopScreen |

### 质量

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| QUAL-1 | type-check | 0 错误 |
| QUAL-2 | lint | 0 错误 |
| QUAL-3 | Web 兼容 | localhost:8082 可运行 |

---

## 注意事项

1. **不要删除旧文件**：HomeScreen、TabNavigator、CitywalkScreen 已标记 `@deprecated`，新功能不要依赖它们。
2. **保持 Web 兼容**：所有动画和手势在 Web 端需降级可用。
3. **状态持久化**：onboardingStore 和 petStore 使用 persist，引导进度和宠物数据不丢失。
4. **命名长度**：用户昵称 1-12 字符，宠物名 1-8 字符。
5. **对话气泡 API**：使用 `immersiveChatStore.addBubble`，字段为 `content`/`role`/`createdAt`，不要传 `text`/`isUser`。
6. **chatService API**：发送消息使用 snake_case：`user_id`, `pet_id`。
7. **宠物起名时机**：必须在 Step 5 完成，不要在 MainScreen 再次触发起名。
8. **长按轮盘优先用 Animated**：避免引入 `react-native-gesture-handler` 复杂配置，Web 兼容优先。

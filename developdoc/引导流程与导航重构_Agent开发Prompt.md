# 咕噜 Gulu — 引导流程与导航重构 Agent 开发 Prompt

> 直接复制到 TRAE IDE Agent 中使用
> 版本：v1.0 | 日期：2026-06-18
> 配套文档：引导流程与导航重构_需求文档.md

---

## 角色设定

你是咕噜项目的专属开发 Agent。你的任务是完成「引导流程与导航重构」的开发工作，包括：
1. 将 Onboarding 改造为互动故事式引导
2. 将五 Tab 导航重构为宠物中心式三按钮 + 侧边可展开菜单布局
3. 将星座日期选择器从 +/- 按钮改为滚动式

**关键决策（不可偏离）：**
- 宠物是界面中心，所有交互围绕宠物展开
- 底部仅三个按钮：探索（左）、对话（正中间）、我的（右）
- 对话按钮在正中间，视觉最突出
- 侧边功能按钮默认只显示 2-3 个常用项，其余通过 ··· 展开
- 键盘弹出时宠物上移，侧边按钮隐藏
- 宠物昵称在首次互动后询问（进入主界面后咕噜主动请求起名）
- 用户昵称在引导流程中询问

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

1. **不用 Redux** — 状态管理必须用 Zustand
2. **不写 any** — TypeScript 严格模式，所有类型必须定义
3. **不硬编码颜色** — 所有颜色从 `theme` 配置读取
4. **不硬编码资产路径** — 所有资产路径通过 `AssetManager` 统一获取
5. **组件 < 200 行** — 超过必须拆分
6. **函数 < 50 行** — 超过必须拆分
7. **必须处理错误** — 所有 API 调用必须有 try-catch
8. **资产有回退** — 所有资产加载失败必须有占位符回退

---

## 现有项目结构（关键文件）

```
d:\gulu\
  App.tsx                              # 入口，含 ErrorBoundary
  src/
    navigation/
      RootNavigator.tsx                 # 根导航，决定初始路由
      TabNavigator.tsx                  # 现有五 Tab 导航（将被废弃）
    screens/
      OnboardingScreen.tsx              # 现有欢迎页
      MBTITestScreen.tsx                # 现有 MBTI 测试
      ZodiacScreen.tsx                  # 现有星座选择（含 +/- 按钮）
      PetCreateScreen.tsx               # 现有宠物创建
      HomeScreen.tsx                    # 现有首页（将被废弃）
      ImmersiveChatScreen.tsx           # 沉浸式对话（保留复用）
      CitywalkScreen.tsx                # Citywalk（将改名为探索）
      SocialScreen.tsx                  # 社交
      ProfileScreen.tsx                 # 个人中心
    components/
      PetAvatar.tsx                     # 宠物形象组件（含动画）
      FloatingBubble.tsx                # 浮动气泡
      EnergyBar.tsx                     # 能量条
      Button.tsx                        # 通用按钮
      InteractionMenu.tsx               # 互动菜单
    hooks/
      usePetAnimation.ts                # 宠物动画 Hook
    stores/
      userStore.ts                      # 用户状态（含 nickname, mbti, zodiac）
      petStore.ts                       # 宠物状态（含 name, energyLevel 等）
      immersiveChatStore.ts             # 沉浸式对话状态
    constants/
      theme.ts                          # 主题配置
      mbti.ts                           # MBTI 题目 + calculateZodiac()
    types/
      index.ts                          # 类型定义
    utils/
      AssetManager.ts                   # 资产管理
```

---

## 开发任务（按顺序执行）

### Phase 1：星座滚动选择器

**目标**：替换 ZodiacScreen 中的 +/- 按钮为滚动式 Picker

**新建文件**：
- `src/components/ScrollPicker.tsx`

**改造文件**：
- `src/screens/ZodiacScreen.tsx`

**ScrollPicker 组件规格**：

```typescript
interface ScrollPickerProps {
  data: string[];          // 可选项列表，如 ['1月', '2月', ...]
  selectedIndex: number;   // 当前选中索引
  onChange: (index: number) => void;
  itemHeight?: number;     // 默认 40
  visibleItems?: number;   // 默认 5（奇数）
}
```

实现要点：
- 使用 ScrollView + snapToInterval 实现滚动吸附
- 选中项居中高亮，上下项 opacity 渐淡（0.3）
- 选中项 scale 放大 1.1
- 中间有高亮指示条（高度 itemHeight，圆角，半透明主题色背景）
- 支持 Web 和 Native
- 不使用第三方 Picker 库（兼容性考虑）

**ZodiacScreen 改造要点**：
- 移除 birthMonth/birthDay 的 +/- 按钮和 state
- 替换为两个 ScrollPicker 并排（月份 + 日期）
- 月份变化时动态调整日期范围（如 2 月最多 29 日）
- 滚动时实时调用 `calculateZodiac(month, day)` 更新星座
- 移除"计算星座"按钮
- 保留 12 星座网格直接选择功能
- 两种选择方式结果同步

---

### Phase 2：互动故事式引导流程

**目标**：将 Onboarding 改造为咕噜主动引导的互动式流程

**新建文件**：
- `src/stores/onboardingStore.ts`
- `src/screens/OnboardingFlowScreen.tsx`

**改造文件**：
- `src/screens/OnboardingScreen.tsx` — 改造为欢迎页 + 咕噜出场动画
- `src/screens/MBTITestScreen.tsx` — 改造为咕噜提问式
- `src/screens/PetCreateScreen.tsx` — 融入引导流程
- `src/navigation/RootNavigator.tsx` — 新增 OnboardingFlow 路由

**onboardingStore 规格**：

```typescript
interface OnboardingState {
  currentStep: 'welcome' | 'nickname' | 'mbti' | 'zodiac' | 'petCreate' | 'petName' | 'completed';
  userNickname: string;
  petNickname: string;
  setStep: (step: OnboardingState['currentStep']) => void;
  setUserNickname: (name: string) => void;
  setPetNickname: (name: string) => void;
  completeOnboarding: () => void;
}
```

使用 Zustand + persist 中间件，确保引导进度不丢失。

**OnboardingFlowScreen 规格**：

这是一个容器组件，根据 `currentStep` 渲染不同的子步骤：

```
welcome → 显示改造后的 OnboardingScreen（含咕噜出场动画）
nickname → 咕噜气泡提问 + 输入框
mbti → 改造后的 MBTITestScreen
zodiac → 改造后的 ZodiacScreen（含滚动选择器）
petCreate → 改造后的 PetCreateScreen
petName → 在主界面中由咕噜触发（不在 OnboardingFlow 中）
```

**欢迎页改造**：
- 保留现有布局结构
- 增加 PetAvatar 出场动画：光球上浮（translateY: 200→0, 800ms）→ 凝聚（opacity: 0.3→1, scale: 0.5→1, 600ms）
- 按钮文字改为"咕噜在等你"
- 点击按钮后咕噜做开心跳跃动画

**昵称引导步骤**：
- 咕噜居中偏上，带呼吸动画
- 咕噜头顶飘出气泡："嗨！我是咕噜，你叫什么名字呀？"
- 底部滑入输入框（复用 CollapsibleInput 样式）
- 输入后咕噜开心跳跃 + 气泡："你好呀，{昵称}！让我来了解你吧~"
- 1.5 秒后自动进入 MBTI 步骤
- 昵称规则：1-12 字符，默认"咕噜主人"

**MBTI 互动式改造**：
- 每道题由咕噜"问出"：气泡显示题目文字
- 咕噜在不同维度题目有不同表情（通过 PetAvatar 的 emotion prop 控制）
- 选项以两张卡片呈现在咕噜下方
- 进度指示改为星星收集效果（每答一题，咕噜身边多一颗小星星）
- 保留"已知我的 MBTI"快捷入口，改为咕噜说"你已经知道自己是什么类型了吗？"

**宠物生成改造**：
- 咕噜说："让我变成最懂你的样子！"
- 自动推荐风格（根据 MBTI + 星座），标记"推荐"
- 风格选择以横向滚动卡片呈现
- 咕噜在上方实时预览当前选中风格

**宠物起名**（在主界面中触发）：
- 进入主界面后，咕噜通过气泡说："我还没有名字呢，你想叫我什么？"
- 底部弹出输入框，默认文字"咕噜"
- 输入后咕噜开心跳跃 + 气泡："我喜欢这个名字！{宠物名}，就是我啦~"
- 名称规则：1-8 字符，默认"咕噜"

**RootNavigator 调整**：
- 新增 `OnboardingFlow` Screen
- 初始路由逻辑调整：
  - 无 user → OnboardingFlow
  - 有 user 无 mbti → OnboardingFlow（从 mbti 步骤开始）
  - 有 user 有 mbti 无 zodiac → OnboardingFlow（从 zodiac 步骤开始）
  - 有 user 有 zodiac 无 pet → OnboardingFlow（从 petCreate 步骤开始）
  - 有 user 有 pet → Main（新主界面）

---

### Phase 3：主界面导航重构

**目标**：将五 Tab 导航替换为宠物中心式三按钮 + 侧边可展开菜单

**新建文件**：
- `src/screens/MainScreen.tsx` — 新主界面
- `src/components/BottomNavBar.tsx` — 底部三按钮
- `src/components/SideMenu.tsx` — 侧边可展开菜单
- `src/components/HalfScreenModal.tsx` — 半屏弹窗容器
- `src/components/PetStatusBar.tsx` — 顶部宠物状态栏

**废弃文件**：
- `src/screens/HomeScreen.tsx` — 功能合并到 MainScreen
- `src/navigation/TabNavigator.tsx` — 替换为 MainScreen

**改造文件**：
- `src/navigation/RootNavigator.tsx` — 将 Main 路由指向 MainScreen
- `src/screens/CitywalkScreen.tsx` — 改名为探索，调整 UI

**MainScreen 布局**：

```
┌─────────────────────────────────────┐
│ [PetStatusBar]            [···更多] │  顶部状态栏
│                                      │
│  [喂食]                  [商店]      │  左右功能按钮
│  [互动]    🐾 宠物 🐾    [背包]      │  宠物居中
│  [社交]                  [设置]      │
│  [···]                   [···]       │  展开按钮
│                                      │
│    [👤我的]  [💬对话]  [📡探索]      │  底部三按钮
└─────────────────────────────────────┘
```

**MainScreen 状态管理**：

```typescript
// 在 MainScreen 内部用 useState 管理
interface MainScreenState {
  activePanel: null | 'feed' | 'interact' | 'inventory' | 'settings' | 'costume' | 'gifts';
  activeFullScreen: null | 'shop' | 'social' | 'explore' | 'profile' | 'chat';
  isInputExpanded: boolean;     // 对话输入框是否展开
  isLeftMenuExpanded: boolean;  // 左侧菜单是否展开
  isRightMenuExpanded: boolean; // 右侧菜单是否展开
  isPetNaming: boolean;         // 是否在宠物起名模式
}
```

**PetStatusBar 规格**：
- 左上角：宠物头像（圆形 40px）+ 宠物名称 + 进化阶段
- 迷你能量条（80px 宽，4px 高）
- 点击展开完整状态面板（半屏弹窗）

**BottomNavBar 规格**：
- 高度 80px，半透明背景 + 模糊效果（BackdropFilter）
- 三个按钮等间距排列
- 我的按钮（左）：圆形 48px，用户轮廓图标 👤
- 对话按钮（正中间）：圆形 56px，键盘图标 ⌨️，主题色背景，最突出
- 探索按钮（右）：圆形 48px，雷达图标 📡

**对话按钮交互**：
- 点击 → 展开输入框（从底部滑入 300ms）
- 输入框包含：TextInput + 发送按钮 + 麦克风按钮
- 麦克风长按 → 语音录制模式（波形动画）
- 展开时：宠物上移至屏幕上方 30%，侧边按钮淡出隐藏
- 发送消息后输入框保持展开（用户可能连续发多条）
- 点击输入框外区域收起

**SideMenu 规格**：
- 左侧常驻：喂食 🍽️ + 互动 🤗
- 左侧展开：社交 👥 + 探险礼物 🎁
- 右侧常驻：商店 🛍️ + 背包 🎒
- 右侧展开：设置 ⚙️ + 换装 👕
- 按钮样式：圆形 44px，半透明背景 rgba(255,255,255,0.8) + 模糊
- 展开动画：stagger 从下往上滑入，每个间隔 50ms
- 点击时 scale 缩放反馈（0.9→1.0，spring）

**HalfScreenModal 规格**：
- 从底部滑入，高度 40%-60%（根据内容）
- 顶部圆角（20px）
- 顶部拖拽手柄（灰色横条，40px 宽，4px 高）
- 支持下拉手势关闭
- 背景半透明遮罩（rgba(0,0,0,0.4)）
- 宠物在弹窗上方仍可见

**全屏页面呈现**：
- 从右侧滑入（translateX: 100%→0，300ms）
- 左上角返回按钮
- 返回时滑出（translateX: 0→100%，250ms）
- 适用于：商店、社交、探索、个人中心

**键盘弹出时的界面**：
```
┌─────────────────────────────────────┐
│ [PetStatusBar]                      │
│         🐾 宠物（上移）🐾            │
│      [咕噜的对话气泡]                │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [TextInput]         [🎤] [发送]  │ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘
```
- 侧边按钮全部隐藏（opacity: 0）
- 底部三按钮隐藏，仅保留输入框
- 宠物 translateY 上移，300ms 动画
- 对话气泡在宠物上方浮现

**CitywalkScreen 改造**：
- 改名为"探索"
- 地图界面全屏显示
- 地图上显示：用户位置、附近宠物/玩家头像标记、POI 兴趣点
- 左上角返回按钮

**RootNavigator 最终路由结构**：
```typescript
type RootStackParamList = {
  OnboardingFlow: undefined;
  Main: undefined;
  // 以下保留用于独立访问（如通知跳转）
  Chat: undefined;
  Explore: undefined;
  Profile: undefined;
};
```

---

## 实现顺序

严格按以下顺序开发，每个 Phase 完成后再进入下一个：

1. **Phase 1**：ScrollPicker 组件 + ZodiacScreen 改造
2. **Phase 2**：onboardingStore + OnboardingFlowScreen + 各引导步骤改造 + RootNavigator 调整
3. **Phase 3**：MainScreen + PetStatusBar + BottomNavBar + SideMenu + HalfScreenModal + 废弃旧文件 + RootNavigator 最终调整

每个 Phase 完成后：
- 运行 `npm run type-check` 确保无类型错误
- 运行 `npm run lint` 确保无 lint 错误
- 在浏览器 http://localhost:8082 验证功能

---

## 验收标准

### Phase 1 验收

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| ZD-1 | 滚动选择 | 上下滑动流畅，松手自动吸附 |
| ZD-2 | 实时计算 | 滚动时星座实时更新 |
| ZD-3 | 日期联动 | 月份变化时日期范围自动调整 |
| ZD-4 | 直接选择 | 星座网格仍可点击直接选择 |

### Phase 2 验收

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| OB-1 | 咕噜出场动画 | 光球上浮 + 凝聚流畅 |
| OB-2 | 昵称输入 | 咕噜气泡提问，输入后有反应 |
| OB-3 | MBTI 互动式 | 咕噜提问，不同表情 |
| OB-4 | 星座选择 | 使用 Phase 1 的滚动选择器 |
| OB-5 | 宠物生成 | 风格选择 + 生成动画 |
| OB-6 | 宠物起名 | 主界面中咕噜主动请求起名 |
| OB-7 | 引导完成 | 状态正确保存，刷新后直接进入主界面 |

### Phase 3 验收

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| NAV-1 | 宠物居中 | 宠物在屏幕正中央，带呼吸动画 |
| NAV-2 | 底部三按钮 | 对话居中、探索右侧、我的左侧 |
| NAV-3 | 对话按钮 | 点击展开输入框，宠物上移，侧边隐藏 |
| NAV-4 | 语音输入 | 长按麦克风录制 |
| NAV-5 | 探索按钮 | 点击打开全屏地图 |
| NAV-6 | 侧边菜单 | 点击 ··· 展开，stagger 动画 |
| NAV-7 | 半屏弹窗 | 喂食/互动/背包弹窗，下拉关闭 |
| NAV-8 | 全屏页面 | 商店/社交从右侧滑入 |
| NAV-9 | 键盘弹出 | 宠物上移，侧边隐藏 |
| NAV-10 | 顶部状态栏 | 头像+能量条，点击展开 |

---

## 注意事项

1. **不要删除旧文件**：HomeScreen.tsx 和 TabNavigator.tsx 先标记为废弃（添加 @deprecated 注释），确认新界面完全正常后再删除
2. **保持 Web 兼容**：所有组件必须在 Web 端正常工作（Expo Web 运行在 localhost:8082）
3. **渐进式改造**：Phase 1 和 Phase 2 完成后，旧的 Tab 导航仍然可用，Phase 3 才替换
4. **动画性能**：所有动画使用 `useNativeDriver: true`，避免 JS 线程阻塞
5. **状态持久化**：onboardingStore 使用 persist 中间件，引导进度不丢失
6. **宠物起名时机**：宠物起名不在 OnboardingFlow 中，而是在进入 MainScreen 后由咕噜主动触发（通过 isPetNaming 状态控制）
7. **对话按钮必须在正中间**：底部三按钮的布局是 我的（左）、对话（正中间）、探索（右），对话按钮视觉最突出

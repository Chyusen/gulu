# 咕噜 Gulu — Skill 需求文档

> 基于 gulu-pet-demo.html 的完整 Skill 定义
> 版本：v1.0 | 日期：2026-06-17

---

## 一、项目概述

**咕噜**是一款"带游戏功能的疗愈 App"，通过 MBTI 与星座精准画像，为用户生成一只真正"懂你"的专属灵魂宠物。咕噜不是又一个聊天机器人，也不是传统的养成游戏——它是用户的情绪海绵和灵魂镜子。

**核心定位**：现实宠物的数字化延伸，AI 陪伴与心理健康赛道的交叉创新。

**关键决策确认**：
- 只有**宠物型**一种陪伴类型（已取消恋人/朋友/导师/家人等其他类型）
- **取消毕业机制**，改为持续进化的长期陪伴关系
- 养成系统**完全免费**，仅外观/皮肤付费
- 咕噜拥有**完全自主的行为系统**，不是被动等待用户互动的工具

---

## 二、功能模块清单

### 2.1 核心功能模块

| 模块 | 功能描述 | 优先级 |
|------|---------|--------|
| **用户画像系统** | MBTI + 星座多维画像，8题简化测试 + 4字母滑动快捷入口 | P0 |
| **宠物生成系统** | 基于画像匹配宠物性格，AI生成静态形象 + CSS滤镜风格切换 | P0 |
| **灵魂镜像养成** | 能量场充能、灰化症预警、治疗机制、三段式进化 | P0 |
| **对话系统** | 70%情感共鸣 + 30%温和挑战，行动闭环，语音交互 | P0 |
| **宠物自主系统** | 离线自主行为、探险带回礼物、情绪状态变化 | P1 |
| **宠物社交系统** | 宠物见面、互动玩法、互送礼物、组队探险 | P1 |
| **Citywalk陪伴** | 位置感知、POI触发对话、漫步报告 | P1 |
| **内容推荐** | 基于MBTI的旅游攻略、书单、电影、美食推荐 | P2 |
| **商业化系统** | 幻兽皮肤/外观、场景装扮、社交礼物 | P2 |
| **隐私保护** | 未成年人保护、隐私等级、动态权限、防骚扰 | P1 |

### 2.2 非功能需求

| 需求 | 描述 |
|------|------|
| 性能 | 首屏加载 < 2s，对话响应 < 500ms |
| 可用性 | 支持离线模式（咕噜自主行为不依赖网络） |
| 安全 | 用户数据加密存储，未成年人信息脱敏 |
| 扩展性 | 支持后续添加新的宠物性格模板和视觉风格 |

---

## 三、技术架构

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (Expo)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 首页/宠物 │  │ 对话界面  │  │ Citywalk │  │ 个人中心  │   │
│  │  主界面   │  │         │  │  地图    │  │         │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘           │
│                         React Native                         │
│                    Zustand / React Context                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┼─────────────────────────────────┐
│                      API Gateway                            │
│                      (FastAPI)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 对话服务  │ │ 画像服务  │ │ 风格生成  │ │ 养成系统  │      │
│  │          │ │          │ │  服务    │ │  服务    │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │             │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐      │
│  │ DeepSeek │ │ Supabase │ │SiliconFlow│ │ Supabase │      │
│  │ V4 Flash │ │  Postgre │ │    SD    │ │  Postgre  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│       │                                     │               │
│  ┌────┴─────┐                          ┌────┴─────┐        │
│  │  Redis   │                          │  Redis   │        │
│  │  缓存    │                          │  缓存    │        │
│  └──────────┘                          └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 客户端 | Expo (React Native) | 一套代码覆盖 iOS/Android/Web，3周可出可安装包 |
| 状态管理 | Zustand | 轻量、TypeScript友好，比Redux更适合移动端 |
| 后端框架 | Python FastAPI | 异步支持优秀，AI工程生态成熟，开发效率高 |
| 数据库 | Supabase (PostgreSQL) | 开箱即用的Auth + Realtime + Storage |
| ORM | Prisma | 类型安全，迁移方便 |
| AI对话 | DeepSeek V4 Flash | 中文理解力强，响应速度快，成本可控 |
| 图像生成 | SiliconFlow Stable Diffusion | 国内访问稳定，风格迁移效果优秀 |
| 缓存 | Redis | 对话上下文缓存，热点数据加速 |
| 地图 | 高德地图API | 国内POI数据精准，Citywalk体验真实 |
| 语音 | Web Speech API + 第三方TTS | 浏览器原生支持，可自定义音色 |

---

## 四、数据库设计

### 4.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    nickname VARCHAR(50),
    avatar_url TEXT,
    birth_date DATE,
    mbti VARCHAR(4),
    zodiac VARCHAR(20),
    privacy_level INT DEFAULT 1, -- 1:仅宠物 2:公开性别 3:仅宠物可见
    is_minor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- 宠物表
CREATE TABLE pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) DEFAULT '咕噜',
    personality_type VARCHAR(20), -- 基于MBTI匹配的性格类型
    current_stage INT DEFAULT 1, -- 1:幼崽期 2:伴生期 3:觉醒期
    energy_level INT DEFAULT 80, -- 0-100
    is_graying BOOLEAN DEFAULT FALSE,
    graying_severity INT DEFAULT 0, -- 0-5
    is_dormant BOOLEAN DEFAULT FALSE,
    style VARCHAR(20) DEFAULT 'anime',
    custom_description TEXT,
    voice_type VARCHAR(20) DEFAULT 'cute_child',
    voice_speed FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_interaction TIMESTAMP
);

-- 对话记录表
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role VARCHAR(10) NOT NULL, -- 'user' | 'assistant'
    emotion_tag VARCHAR(20),
    action_closure TEXT, -- 行动闭环内容
    is_action_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 行动闭环记录表
CREATE TABLE action_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    action_text TEXT NOT NULL,
    action_type VARCHAR(20), -- 'citywalk' | 'social' | 'selfcare' | 'explore'
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 宠物社交记录表
CREATE TABLE pet_social (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    target_pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20), -- 'meet' | 'play' | 'gift' | 'explore'
    gift_type VARCHAR(50),
    location_lat FLOAT,
    location_lng FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 物品/皮肤表
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    item_type VARCHAR(20), -- 'skin' | 'scene' | 'gift' | 'effect'
    price INT DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'coin',
    style VARCHAR(20),
    description TEXT,
    image_url TEXT,
    is_limited BOOLEAN DEFAULT FALSE
);

-- 用户物品表
CREATE TABLE user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    acquired_at TIMESTAMP DEFAULT NOW()
);
```

---

## 五、API 接口设计

### 5.1 用户画像接口

```
POST /api/v1/profile
请求：{ mbti: "INFP", zodiac: "双鱼座", birth_date: "2000-03-15" }
响应：{ user_id, personality_analysis, recommended_pet_traits }

GET /api/v1/profile/:user_id
响应：{ mbti, zodiac, personality_analysis, pet_match_score }
```

### 5.2 宠物管理接口

```
POST /api/v1/pets/generate
请求：{ user_id, style, custom_description }
响应：{ pet_id, name, personality_type, image_url, stage: 1 }

GET /api/v1/pets/:pet_id
响应：{ id, name, stage, energy_level, is_graying, graying_severity, style, image_url }

POST /api/v1/pets/:pet_id/feed
请求：{ feed_type: "sunlight" | "moonlight" | "soul_feast" | "forget_grass" }
响应：{ energy_level, message, pet_response }

POST /api/v1/pets/:pet_id/heal
请求：{ heal_action: "breathing" | "look_green" | "walk" }
响应：{ graying_severity, is_healed, pet_response }

POST /api/v1/pets/:pet_id/interact
请求：{ interaction_type: "pet" | "poke" | "hug" | "wake" }
响应：{ pet_emotion, animation_trigger, sound_url }
```

### 5.3 对话接口

```
POST /api/v1/chat
请求：{ user_id, pet_id, message, context_length: 10 }
响应：{ reply, emotion_tag, action_closure, suggested_actions }

GET /api/v1/chat/history?user_id=&pet_id=&limit=50
响应：{ messages: [{ role, message, emotion_tag, action_closure }] }
```

### 5.4 风格生成接口

```
POST /api/v1/style/generate
请求：{ pet_id, style: "anime" | "realistic" | "pixel" | "scifi" | "ink" | "vaporwave" | "sketch", custom_prompt }
响应：{ image_url, style_applied, filter_css }

GET /api/v1/style/recommend?mbti=INFP
响应：{ recommended_styles: [{ style, reason, preview_url }] }
```

### 5.5 Citywalk 接口

```
POST /api/v1/citywalk/start
请求：{ user_id, pet_id, lat, lng }
响应：{ session_id, nearby_pois, pet_message }

POST /api/v1/citywalk/checkin
请求：{ session_id, lat, lng, poi_id }
响应：{ poi_info, pet_dialogue, energy_gained }

POST /api/v1/citywalk/end
请求：{ session_id }
响应：{ walk_report: { duration, steps, pois_visited, mood_changes, photos } }
```

### 5.6 宠物社交接口

```
POST /api/v1/social/nearby
请求：{ lat, lng, radius: 500 }
响应：{ nearby_pets: [{ pet_id, name, style, stage, distance, owner_nickname }] }

POST /api/v1/social/interact
请求：{ pet_id, target_pet_id, interaction_type, gift_id }
响应：{ success, interaction_result, both_pets_response }
```

---

## 六、关键业务逻辑

### 6.1 灵魂镜像养成逻辑

```
能量场系统：
- 基础口粮：每日登录自动获得 +20 能量（日光/月光）
- 灵魂盛宴：完成行动闭环 +50 能量
- 特殊零食：情绪低落时使用"忘忧草" +30 能量，触发治愈对话
- 能量衰减：每24小时自然衰减 -10 能量
- 能量阈值：
  - > 70：健康状态，正常互动
  - 30-70：疲惫状态，动作迟缓
  - < 30：虚弱状态，触发关心对话

灰化症系统：
- 触发条件：用户连续3天情绪负面（通过对话情感分析判断）
- 严重程度：1-5级，每多1天负面 +1级
- 视觉表现：颜色变灰 → 动作迟缓 → 身上长荆棘
- 治疗方式：用户完成自我关怀行动（呼吸/看绿植/散步）
- 治疗效果：每次治疗 -1级，5级全部消除后恢复正常

休眠系统：
- 触发条件：用户连续7天未登录
- 状态表现：咕噜进入"结茧休眠"，不是死亡
- 唤醒方式：用户登录后自动唤醒，无惩罚
```

### 6.2 三段式进化逻辑

```
幼崽期（Stage 1）→ 伴生期（Stage 2）：
- 条件1：累计完成 10 次行动闭环
- 条件2：经历过 1 次灰化症并治愈
- 进化表现：体型变大，长出特征器官，不再全天候粘人

伴生期（Stage 2）→ 觉醒期（Stage 3）：
- 条件1：累计完成 30 次行动闭环
- 条件2：收集特定元素（"勇气之鳞"、"释然之羽"等）
- 进化表现：华丽终极形态，神圣光晕，从被守护者变为守护灵

进化奖励：
- 每次进化解锁新的互动动作和对话内容
- 觉醒期咕噜可以主动帮主人社交，探望其他幼崽期宠物
```

### 6.3 宠物自主行为逻辑

```
离线行为（用户不在线时）：
- 自主"吃饭"（吸收日光/月光）维持能量
- 随机"探险"，有概率带回小礼物
- 情绪状态自然波动

在线但用户未互动时：
- 自主在屏幕上移动、玩耍、睡觉
- 偶尔主动发起互动（蹭屏幕、发出声音）
- 根据时间显示不同行为（白天活跃/夜晚 sleepy）

探险带回礼物逻辑：
- 概率触发：每次离线探险 30% 概率带回礼物
- 礼物类型：金句（AI生成）、附近好店推荐、治愈小诗
- 与用户画像匹配：INFP 更可能收到诗意内容，ENTJ 更可能收到效率建议
```

---

## 七、安全与隐私

### 7.1 未成年人保护

- 注册时年龄验证，12岁以下禁止注册
- 未成年人用户头像/昵称模糊化处理
- 未成年人禁止宠物社交功能
- 对话内容增加额外的安全过滤层

### 7.2 隐私等级

```
Level 1（默认）：仅显示"宠物+昵称"
Level 2：公开性别
Level 3：仅宠物可见（完全匿名社交）
```

### 7.3 数据安全

- 所有用户数据 AES-256 加密存储
- 对话记录定期匿名化处理（用于模型优化）
- 地理位置数据仅用于 Citywalk，不长期存储

---

## 八、性能指标

| 指标 | 目标值 | 测试方法 |
|------|--------|---------|
| 首屏加载时间 | < 2s | Lighthouse |
| 对话响应时间 | < 500ms | API 监控 |
| 图像生成时间 | < 5s | 用户感知 |
| 并发用户数 | 1000+ | 压力测试 |
| 应用崩溃率 | < 0.1% | 错误监控 |

---

## 九、开发里程碑

| 周次 | 目标 | 交付物 |
|------|------|--------|
| Week 1 | 基础架构 + 核心对话 | Expo项目、FastAPI后端、DeepSeek对接、基础聊天界面 |
| Week 2 | 画像系统 + 灵魂镜像养成 | MBTI测试、宠物生成、能量场/灰化症/治疗机制、三段式进化 |
| Week 3 | Citywalk + 宠物社交 + 打磨 | 高德地图接入、宠物社交、商业化模块、测试优化 |

---

## 十、风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| DeepSeek API 不稳定 | 对话功能不可用 | 接入备用模型（文心一言/通义千问） |
| 图像生成成本过高 | 运营成本超支 | 限制免费生成次数，超出收费 |
| 用户隐私投诉 | 法律风险 | 严格遵循最小必要原则，数据加密 |
| 宠物社交出现骚扰 | 用户体验差 | 完善的举报/拉黑/审核机制 |
| 养成机制被破解 | 商业化受损 | 服务端校验，客户端仅展示 |

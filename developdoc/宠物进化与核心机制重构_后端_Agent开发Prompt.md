# 咕噜 Gulu — 宠物进化与核心机制重构 后端 Agent 开发 Prompt

> 直接复制到 TRAE IDE Agent 中使用
> 版本：v1.0 | 日期：2026-06-20
> 配套文档：宠物进化与核心机制重构_需求文档.md、宠物进化与核心机制重构_前端_Agent开发Prompt.md
> 项目总技术栈：咕噜_Agent开发Prompt.md

---

## 角色设定

你是咕噜项目的后端开发 Agent，专注于 Python FastAPI 后端服务开发。你的任务是根据前端需求，为「宠物进化与核心机制重构」提供必要的后端 API 支持，包括：

1. 用户画像更新（新增 gender 字段）
2. 宠物进化判定与执行
3. 宠物数值管理（体力/亲密度/能量/衰减）
4. 食物系统与喂食
5. 货币系统（咕噜币/星尘）
6. 每日/每周任务生成与进度
7. 探索相关 API（散步/运动/自主探索/附近/小红书笔记）
8. 咕噜悄悄话生成
9. 昵称合规审查
10. 好友系统基础

**关键决策（不可偏离）：**

- 后端技术栈必须使用 Python FastAPI。
- 数据库使用 Supabase (PostgreSQL)，ORM 使用 Prisma。
- AI 对话使用 DeepSeek V4 Flash，图像生成使用 SiliconFlow Stable Diffusion。
- 地图/POI 使用高德地图 API。
- 所有 API 必须包含错误处理、输入校验、日志记录。
- 返回给前端的数据结构必须与前端 TypeScript 类型对齐。
- Demo 模式降级：Supabase/Redis/外部 API 未配置时使用内存存储和默认数据。

---

## 技术栈（不可更改）

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | Python FastAPI | 不用 Node.js |
| 数据库 | Supabase (PostgreSQL) | Auth + Realtime + Storage |
| ORM | Prisma | 类型安全 |
| AI 对话 | DeepSeek V4 Flash | 中文理解力强 |
| 图像生成 | SiliconFlow Stable Diffusion | 国内稳定访问 |
| 缓存 | Redis | 可选，用于缓存攻略结果 |
| 地图/POI | 高德地图 API | 国内 POI 数据 |

---

## 开发红线

1. **不用 Node.js 后端** — 后端必须用 Python FastAPI。
2. **输入必须校验** — 所有接口使用 Pydantic 模型校验。
3. **必须处理错误** — 所有外部 API 调用必须有 try-catch 与降级方案。
4. **必须写日志** — 关键路径打印结构化日志。
5. **必须保护隐私** — 用户数据加密存储，位置信息模糊化（保留 3 位小数，约 100m 精度）。
6. **必须返回统一响应格式** — `{ code, data, message }` 或 HTTPException。
7. **数据库操作必须通过 Prisma** — 不直接写 SQL。
8. **外部 API 必须有超时与重试** — timeout 5s，重试 2 次。
9. **Demo 降级** — Supabase/Redis/外部 API 不可用时，使用内存存储和默认数据，确保 Demo 可运行。
10. **散步/运动/Citywalk/室内活动都增加能量和亲密度** — 这是心理疗愈的核心机制，后端必须正确计算。

---

## 现有后端结构（参考）

```
/gulu-project
  /backend
    /app
      /api                # 路由
        /v1
          /endpoints      # 各功能端点
      /services           # 业务逻辑
      /models             # 数据模型
      /core               # 核心配置
      /utils              # 工具函数
      /schemas            # Pydantic 模型
    main.py
    requirements.txt
    Dockerfile
    prisma/
      schema.prisma
```

---

## 开发任务

### API 1：更新用户画像（新增 gender）

**路由**：`PUT /api/users/profile`

**请求体**：

```json
{
  "nickname": "string, optional, 1-12 chars",
  "mbti": "string, optional, 4 chars",
  "zodiac": "string, optional",
  "gender": "string, optional, male|female|undisclosed"
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "id": "user_id",
    "nickname": "...",
    "mbti": "INFJ",
    "zodiac": "双鱼座",
    "gender": "female"
  },
  "message": "success"
}
```

**实现要点**：
- 校验 gender 枚举值。
- 更新 users 表 gender 字段。
- 返回更新后的用户对象。

---

### API 2：宠物进化判定

**路由**：`GET /api/pets/{pet_id}/evolution-check`

**响应**：

```json
{
  "code": 0,
  "data": {
    "can_evolve": true,
    "to_stage": 2,
    "current_stage": 1,
    "requirements": {
      "intimacy": { "current": 210, "required": 200, "met": true },
      "energy": { "current": 520, "required": 500, "met": true },
      "stamina_percent": { "current": 0.65, "required": 0.5, "met": true }
    }
  },
  "message": "success"
}
```

**实现要点**：
- 根据 `pet.stage_number` 查找对应进化阈值。
- 检查亲密度、能量、体力百分比是否同时满足。
- 返回各项指标的当前值和所需值。

---

### API 3：执行宠物进化

**路由**：`POST /api/pets/{pet_id}/evolve`

**请求体**：无

**响应**：

```json
{
  "code": 0,
  "data": {
    "pet_id": "...",
    "previous_stage": 1,
    "current_stage": 2,
    "unlocked": ["新互动动作", "新对话风格", "探索范围+50%"],
    "new_limits": {
      "stamina": 150,
      "intimacy": 500,
      "energy": 1500
    }
  },
  "message": "你的咕噜进化为成长体！"
}
```

**实现要点**：
- 先调用进化判定逻辑，确认条件满足。
- 更新 `stage_number`、`current_stage`、`max_stamina`、`max_intimacy`、`max_total_energy`。
- 如果条件不满足，返回 400 错误和原因。
- 返回解锁内容列表。

---

### API 4：宠物数值更新（体力/亲密度/能量）

**路由**：`POST /api/pets/{pet_id}/stats`

**请求体**：

```json
{
  "stamina_delta": 0,
  "intimacy_delta": 0,
  "energy_delta": 0,
  "reason": "feed|interact|explore|companion|decay|auto_explore"
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "stamina": 85,
    "max_stamina": 100,
    "intimacy": 45,
    "max_intimacy": 300,
    "total_energy": 120,
    "max_total_energy": 500
  },
  "message": "success"
}
```

**实现要点**：
- 各数值增减后 clamp 到 [0, max]。
- `reason=decay` 时只减少亲密度，按衰减规则计算。
- `reason=explore` 或 `reason=companion` 时增加能量和亲密度。
- 更新 `last_interaction_at`（非衰减操作时）。

---

### API 5：亲密度衰减计算

**路由**：`GET /api/pets/{pet_id}/intimacy-decay`

**响应**：

```json
{
  "code": 0,
  "data": {
    "current_intimacy": 45,
    "hours_since_interaction": 48,
    "decay_amount": 0.9,
    "new_intimacy": 44.1,
    "decay_tier": "mild"
  },
  "message": "success"
}
```

**衰减规则**：
- 0~24h：不衰减
- 24~72h：每天 -2%（mild）
- 72h+：每天 -5%（accelerated）

**实现要点**：
- 根据 `last_interaction_at` 计算距上次互动的小时数。
- 按衰减规则计算应衰减值。
- 返回衰减层级和具体数值。

---

### API 6：喂食

**路由**：`POST /api/pets/{pet_id}/feed`

**请求体**：

```json
{
  "food_id": "string",
  "quantity": 1
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "stamina_gained": 18,
    "intimacy_gained": 12,
    "is_preferred": true,
    "preference_bonus": "40%",
    "new_stamina": 88,
    "new_intimacy": 57,
    "gulu_coin_spent": 30
  },
  "message": "success"
}
```

**实现要点**：
- 查找食物数据，获取体力恢复和亲密度基础值。
- 检查是否为宠物偏好食物，若是则亲密度额外增长 30%~50%（按品质）。
- 扣减咕噜币（基础食物免费，检查每日限额）。
- 更新宠物体力和亲密度。
- 更新 `last_interaction_at`。

---

### API 7：货币操作

**路由**：`POST /api/users/{user_id}/currency`

**请求体**：

```json
{
  "currency_type": "gulu_coin|star_dust",
  "amount": 100,
  "operation": "add|spend",
  "reason": "task_reward|explore|purchase|recharge|reshape"
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "gulu_coin": 280,
    "star_dust": 15
  },
  "message": "success"
}
```

**实现要点**：
- `operation=spend` 时检查余额是否充足，不足返回 400。
- 更新用户货币余额。
- 记录货币变动日志（currency_logs 表）。

---

### API 8：每日任务生成

**路由**：`GET /api/tasks/daily`

**查询参数**：

```
user_id: string
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "tasks": [
      {
        "id": "task_1",
        "type": "chat",
        "description": "与宠物对话 1 次",
        "current_progress": 0,
        "target_progress": 1,
        "reward": 20,
        "is_completed": false,
        "is_claimed": false
      }
    ],
    "streak_days": 3,
    "streak_bonus": 1.5,
    "reset_at": "2026-06-21T04:00:00Z"
  },
  "message": "success"
}
```

**实现要点**：
- 根据宠物进化阶段确定任务门槛。
- 每天凌晨 4:00 重置，生成新任务。
- 连击加成：连续 3 天全完成，第 4 天起奖励 ×1.5。
- 阶梯奖励在领取时计算。

---

### API 9：每周任务生成

**路由**：`GET /api/tasks/weekly`

**查询参数**：

```
user_id: string
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "tasks": [
      {
        "id": "weekly_1",
        "type": "explore",
        "description": "累计探索 5 次",
        "current_progress": 2,
        "target_progress": 5,
        "base_reward": 10,
        "is_completed": false,
        "is_claimed": false
      }
    ],
    "daily_completion_rate": 0.85,
    "star_dust_multiplier": 1.5,
    "reset_at": "2026-06-23T04:00:00Z"
  },
  "message": "success"
}
```

**实现要点**：
- 每周一凌晨 4:00 重置。
- 星尘奖励 = 基础星尘 × 每日完成率系数。
- 完成率系数：100% → ×2.0，≥80% → ×1.5，≥50% → ×1.0，<50% → ×0.5。

---

### API 10：任务进度更新与领取

**路由**：`PUT /api/tasks/{task_id}/progress`

**请求体**：

```json
{
  "progress_delta": 1
}
```

**路由**：`POST /api/tasks/{task_id}/claim`

**响应**：

```json
{
  "code": 0,
  "data": {
    "reward_type": "gulu_coin",
    "reward_amount": 40,
    "new_balance": { "gulu_coin": 320, "star_dust": 15 }
  },
  "message": "success"
}
```

**实现要点**：
- 进度更新时 clamp 到 [0, target]。
- 领取时检查任务是否已完成且未领取。
- 每日任务领取时计算阶梯奖励和连击加成。
- 每周任务领取时计算完成率系数。
- 奖励写入货币余额。

---

### API 11：散步/运动记录

**路由**：`POST /api/explore/activity`

**请求体**：

```json
{
  "user_id": "string",
  "activity_type": "walk|run|citywalk",
  "duration_minutes": 30,
  "distance_meters": 2500,
  "route_points": [{ "lat": 31.2304, "lng": 121.4737, "timestamp": "..." }]
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "stamina_cost": 15,
    "energy_gained": 20,
    "intimacy_gained": 8,
    "gulu_coin_gained": 10,
    "gulu_comment": "今天走了好远呢，咕噜好开心！"
  },
  "message": "success"
}
```

**实现要点**：
- 根据活动类型和时长计算体力消耗、能量增长、亲密度增长。
- 散步：体力 -10~20，能量 +15~30，亲密度 +5~10
- 运动：体力 -20~40，能量 +25~50，亲密度 +8~15
- Citywalk：体力 -15~30，能量 +20~40，亲密度 +5~10
- 检查体力是否充足，不足返回 400。
- 调用 DeepSeek 生成咕噜评语（Demo 降级用预设文案）。
- 更新宠物数值和货币余额。
- 更新相关任务进度。

---

### API 12：室内陪伴活动

**路由**：`POST /api/explore/companion`

**请求体**：

```json
{
  "user_id": "string",
  "activity_type": "meditation|pomodoro|journal|music",
  "duration_minutes": 10
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "energy_gained": 8,
    "intimacy_gained": 5,
    "stamina_cost": 0,
    "gulu_comment": "一起安静地待着，也很幸福呢～"
  },
  "message": "success"
}
```

**实现要点**：
- 室内活动不消耗体力，只增加能量和亲密度。
- 冥想：能量 +5~15，亲密度 +5
- 番茄学习：能量 +10，亲密度 +15
- 写日记：能量 +5，亲密度 +10
- 听音乐：能量 +8，亲密度 +5
- 调用 DeepSeek 生成咕噜回应（Demo 降级用预设文案）。
- 更新宠物数值。
- 更新相关任务进度。

---

### API 13：宠物自主探索

**路由**：`POST /api/explore/auto-explore/start`

**请求体**：

```json
{
  "pet_id": "string",
  "duration_hours": 2
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "estimated_stamina_cost": 10,
    "started_at": "2026-06-20T10:00:00Z",
    "will_return_at": "2026-06-20T12:00:00Z"
  },
  "message": "咕噜出发去探索啦！"
}
```

**路由**：`POST /api/explore/auto-explore/complete`

**请求体**：

```json
{
  "pet_id": "string"
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "stamina_cost": 10,
    "energy_gained": 30,
    "gulu_coin_gained": 25,
    "items_found": ["crystal_shard"],
    "whisper": {
      "id": "whisper_1",
      "story": "今天在花园里遇到了一只小蝴蝶，它跟我说了很多远方的故事...",
      "personality_tag": "solo"
    }
  },
  "message": "咕噜回来啦！"
}
```

**实现要点**：
- 开始时检查体力是否充足（体力 ≥ 预计消耗）。
- 体力消耗 = duration_hours × 每小时消耗（萌芽体 5、成长体 8、灵魂体 12）。
- 完成时计算奖励，生成悄悄话。
- 悄悄话根据宠物性格生成：外向 → 社交型故事，内向 → 独白型故事。
- Demo 阶段使用预设故事模板，后续接入 DeepSeek 实时生成。
- 更新宠物数值、货币余额、任务进度。

---

### API 14：附近 POI 与用户

**路由**：`GET /api/explore/nearby`

**查询参数**：

```
lat: float
lng: float
radius: int, optional, default 3000
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "pois": [
      {
        "id": "poi_1",
        "name": "xx 咖啡馆",
        "type": "咖啡馆",
        "lat": 31.2304,
        "lng": 121.4737,
        "distance": 120,
        "address": "..."
      }
    ],
    "nearby_users": [
      {
        "user_id": "u_1",
        "nickname": "小星",
        "pet_name": "团子",
        "gender": "female",
        "mbti": "INFP",
        "zodiac": "双鱼座",
        "show_gender": true,
        "show_mbti": true,
        "show_zodiac": false,
        "distance": 230
      }
    ],
    "xiaohongshu_notes": [
      {
        "id": "note_1",
        "title": "这家咖啡馆太治愈了",
        "cover_url": "https://...",
        "lat": 31.2305,
        "lng": 121.4738,
        "distance": 150,
        "tags": ["美食", "咖啡"]
      }
    ]
  },
  "message": "success"
}
```

**实现要点**：
- POI 数据调用高德 API 获取。
- 附近用户根据隐私设置过滤展示字段。
- 位置精度模糊化为 3 位小数（约 100m）。
- 小红书笔记 Demo 阶段使用 Mock 数据。
- 附近用户 Demo 阶段使用 Mock 数据（标记 `is_virtual: true`）。

---

### API 15：昵称合规审查

**路由**：`POST /api/utils/nickname-check`

**请求体**：

```json
{
  "nickname": "string"
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "is_valid": false,
    "reason": "包含广告内容"
  },
  "message": "success"
}
```

**实现要点**：
- 本地敏感词库检查（广告、违规、侮辱性词汇）。
- 后续可接入第三方内容审核 API。
- 返回是否合规和原因。

---

### API 16：好友系统基础

**路由**：

- `GET /api/friends?user_id=xxx`：获取好友列表
- `POST /api/friends/add`：添加好友
- `POST /api/friends/block`：拉黑用户
- `POST /api/friends/report`：举报用户

**好友列表响应**：

```json
{
  "code": 0,
  "data": {
    "friends": [
      {
        "user_id": "u_2",
        "nickname": "小月",
        "pet_name": "棉花",
        "is_online": true
      }
    ]
  },
  "message": "success"
}
```

**举报请求体**：

```json
{
  "target_user_id": "string",
  "reason": "harassment|ad|inappropriate|other",
  "description": "optional string"
}
```

**实现要点**：
- Demo 阶段好友列表使用 Mock 数据。
- 拉黑后加入黑名单，附近用户不再展示。
- 举报记录存入 reports 表。

---

## 数据库 Schema 新增/调整

### users 表新增字段

```prisma
model User {
  // ... 已有字段
  gender      String?   // male, female, undisclosed
  gulu_coin   Int       @default(0)
  star_dust   Int       @default(0)
}
```

### pets 表新增字段

```prisma
model Pet {
  // ... 已有字段
  stamina          Int       @default(100)
  max_stamina      Int       @default(100)
  intimacy         Int       @default(0)
  max_intimacy     Int       @default(300)
  total_energy     Int       @default(0)
  max_total_energy Int       @default(500)
  preferred_foods  String?   // JSON array of food IDs
  last_interaction_at DateTime?
}
```

### 新增表

```prisma
model DailyTask {
  id               String   @id @default(uuid())
  user_id          String
  type             String   // chat, feed, explore, companion, social
  description      String
  current_progress Int      @default(0)
  target_progress  Int
  reward           Int
  is_completed     Boolean  @default(false)
  is_claimed       Boolean  @default(false)
  created_at       DateTime @default(now())
  expires_at       DateTime
}

model WeeklyTask {
  id               String   @id @default(uuid())
  user_id          String
  type             String   // explore, chat, companion
  description      String
  current_progress Int      @default(0)
  target_progress  Int
  base_reward      Int
  is_completed     Boolean  @default(false)
  is_claimed       Boolean  @default(false)
  created_at       DateTime @default(now())
  expires_at       DateTime
}

model TaskStreak {
  id                String   @id @default(uuid())
  user_id           String   @unique
  streak_days       Int      @default(0)
  last_complete_date String?
}

model AutoExplore {
  id                    String   @id @default(uuid())
  pet_id                String
  started_at            DateTime
  duration_hours        Int
  estimated_stamina_cost Int
  is_completed          Boolean  @default(false)
}

model GuluWhisper {
  id              String   @id @default(uuid())
  pet_id          String
  story           String
  personality_tag String   // social, solo
  created_at      DateTime @default(now())
}

model Friend {
  id          String   @id @default(uuid())
  user_id     String
  friend_id   String
  created_at  DateTime @default(now())

  @@unique([user_id, friend_id])
}

model BlockList {
  id            String   @id @default(uuid())
  user_id       String
  blocked_id    String
  created_at    DateTime @default(now())

  @@unique([user_id, blocked_id])
}

model Report {
  id            String   @id @default(uuid())
  reporter_id   String
  target_id     String
  reason        String
  description   String?
  created_at    DateTime @default(now())
}

model CurrencyLog {
  id            String   @id @default(uuid())
  user_id       String
  currency_type String   // gulu_coin, star_dust
  amount        Int
  operation     String   // add, spend
  reason        String
  created_at    DateTime @default(now())
}
```

---

## 实现顺序

1. **Schema 调整**：更新 Prisma schema，新增字段和表。
2. **API 1**：用户画像更新（gender）。
3. **API 7**：货币操作。
4. **API 4, 5**：宠物数值更新 + 亲密度衰减。
5. **API 6**：喂食。
6. **API 2, 3**：进化判定 + 执行进化。
7. **API 8, 9, 10**：任务系统。
8. **API 11, 12**：散步/运动/室内活动。
9. **API 13**：宠物自主探索。
10. **API 14**：附近 POI/用户/笔记。
11. **API 15**：昵称审查。
12. **API 16**：好友系统。
13. **单元测试**：核心服务函数测试。

---

## 验收标准

| 编号 | 验收项 | 通过标准 |
|------|--------|---------|
| BACK-1 | 用户画像更新 | `PUT /api/users/profile` 支持 gender 字段 |
| BACK-2 | 进化判定 | `GET /api/pets/{id}/evolution-check` 正确返回三维指标 |
| BACK-3 | 执行进化 | `POST /api/pets/{id}/evolve` 条件满足时进化，不满足时拒绝 |
| BACK-4 | 亲密度衰减 | 衰减规则正确：24h 内不衰减，24~72h -2%/天，72h+ -5%/天 |
| BACK-5 | 喂食 | 偏好食物亲密度额外增长 30%~50%，扣减咕噜币 |
| BACK-6 | 货币操作 | 咕噜币/星尘增减正确，余额不足时拒绝扣减 |
| BACK-7 | 每日任务 | 凌晨 4:00 重置，阶梯奖励和连击加成正确 |
| BACK-8 | 每周任务 | 周一凌晨 4:00 重置，星尘系数按完成率计算 |
| BACK-9 | 散步/运动 | 体力消耗、能量增长、亲密度增长正确 |
| BACK-10 | 室内活动 | 不消耗体力，能量和亲密度增长正确 |
| BACK-11 | 自主探索 | 体力消耗按时长和进化阶段计算，悄悄话按性格生成 |
| BACK-12 | 附近 | POI/用户/笔记数据正确返回，隐私设置过滤生效 |
| BACK-13 | 昵称审查 | 敏感词被拦截 |
| BACK-14 | Demo 降级 | Supabase/Redis/外部 API 不可用时仍可运行 |
| BACK-15 | 单元测试 | 核心服务函数至少 3 个测试 |

---

## 注意事项

1. **隐私保护**：附近用户返回前根据隐私设置过滤字段，位置模糊化为 3 位小数。
2. **Demo 降级**：所有外部 API（高德、DeepSeek、SiliconFlow）不可用时使用默认数据，确保 Demo 可运行。
3. **亲密度衰减**：后端提供计算接口，前端在启动时和进入主界面时调用，不在后端自动执行衰减。
4. **咕噜悄悄话**：Demo 阶段使用预设故事模板（按性格分类），后续接入 DeepSeek 实时生成。
5. **食物偏好**：根据宠物性格类型（由 MBTI×星座交叉匹配决定）确定偏好食物列表。
6. **任务门槛**：根据宠物 `stage_number` 动态调整任务目标值。
7. **货币日志**：所有货币变动记录到 `CurrencyLog` 表，便于排查数据不一致问题。

# 咕噜 Gulu — 引导流程与主界面重构 后端 Agent 开发 Prompt

> 直接复制到 TRAE IDE Agent 中使用
> 版本：v2.0 | 日期：2026-06-18
> 配套文档：引导流程与主界面重构_需求文档.md、引导流程与主界面重构_前端_Agent开发Prompt.md
> 项目总技术栈：咕噜_Agent开发Prompt.md

---

## 角色设定

你是咕噜项目的后端开发 Agent，专注于 Python FastAPI 后端服务开发。你的任务是根据前端需求，为「引导流程与主界面重构」提供必要的后端 API 支持，包括：

1. 用户画像保存（nickname、mbti、zodiac）
2. AI 宠物形象生成
3. 宠物创建与持久化
4. 附近宠物/用户发现
5. Citywalk 攻略检索与生成

**关键决策（不可偏离）：**

- 后端技术栈必须使用 Python FastAPI。
- 数据库使用 Supabase (PostgreSQL)，ORM 使用 Prisma。
- AI 对话使用 DeepSeek V4 Flash，图像生成使用 SiliconFlow Stable Diffusion。
- Citywalk 攻略必须真实检索+AI 生成，不能直接返回固定 mock 数据。
- 所有 API 必须包含错误处理、输入校验、日志记录。
- 返回给前端的数据结构必须与前端 TypeScript 类型对齐。

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
5. **必须返回统一响应格式** — `{ code, data, message }` 或 HTTPException。
6. **数据库操作必须通过 Prisma** — 不直接写 SQL。
7. **外部 API 必须有超时与重试** — timeout 5s，重试 2 次。
8. **Citywalk 攻略必须真实** — 基于高德 POI 检索 + DeepSeek 生成，不能直接返回固定文案。
9. **AI 生成必须异步或快速返回** — 首次返回生成中状态，前端可轮询结果。
10. **代码必须写单元测试** — 核心服务函数至少 1 个测试。

---

## 现有后端结构（参考）

```
/gulu-project
  /backend
    /app
      /api                # 路由
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

### API 1：保存用户画像

**路由**：`POST /api/users/profile`

**请求体**：

```json
{
  "nickname": "string, 1-12 chars",
  "mbti": "string, 4 chars, e.g. INFJ",
  "zodiac": "string, e.g. 摩羯座"
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
    "zodiac": "摩羯座"
  },
  "message": "success"
}
```

**实现要点**：
- 校验 nickname 长度、mbti 格式、zodiac 枚举。
- 更新 users 表。
- 返回更新后的用户对象。

---

### API 2：AI 宠物形象生成

**路由**：`POST /api/pets/generate-image`

**请求体**：

```json
{
  "style": "anime | realistic | pixel | scifi | ink | vaporwave | sketch",
  "custom_prompt": "optional string, e.g. 赛博朋克小狐狸",
  "mbti": "optional string",
  "zodiac": "optional string"
}
```

**响应（同步快速返回）**：

```json
{
  "code": 0,
  "data": {
    "task_id": "uuid",
    "status": "pending | generating | completed | failed",
    "image_url": null,
    "prompt_used": "最终发送给 SD 的英文 prompt"
  },
  "message": "生成任务已创建"
}
```

**响应（轮询查询）**：`GET /api/pets/generate-image/{task_id}`

```json
{
  "code": 0,
  "data": {
    "task_id": "uuid",
    "status": "completed",
    "image_url": "https://...",
    "prompt_used": "..."
  },
  "message": "success"
}
```

**实现要点**：
- 接收风格与自定义描述词。
- 使用 DeepSeek 将中文描述词翻译/扩展为英文 SD prompt。
- 根据 style 添加对应风格关键词。
- 调用 SiliconFlow Stable Diffusion API 生成图片。
- 图片上传至 Supabase Storage，返回可访问 URL。
- 任务状态存入 Redis 或数据库（建议 tasks 表）。
- 生成失败时返回失败状态与原因，并提供默认占位图 URL。

**Prompt 模板示例**：

```
A cute mystical pet companion, {style_keywords}, {custom_prompt}, 
soft glowing purple aura, dreamy cosmic background, 
high quality, detailed, kawaii, transparent-friendly background
```

风格关键词映射：
- anime: anime style, chibi
- realistic: realistic fur, lifelike
- pixel: pixel art, 16-bit
- scifi: cyberpunk, neon, futuristic
- ink: chinese ink wash, sumi-e
- vaporwave: vaporwave aesthetic, retrowave
- sketch: pencil sketch, hand-drawn

---

### API 3：创建宠物

**路由**：`POST /api/pets`

**请求体**：

```json
{
  "name": "string, 1-8 chars",
  "style": "anime | realistic | pixel | scifi | ink | vaporwave | sketch",
  "custom_description": "optional string",
  "image_task_id": "optional uuid, 关联生成任务"
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "id": "pet_id",
    "user_id": "user_id",
    "name": "咕噜",
    "style": "anime",
    "personality_type": "INFJ-摩羯型灵魂镜",
    "current_stage": "baby",
    "stage_number": 1,
    "energy_level": 80,
    "max_energy": 100,
    "image_url": "https://...",
    "created_at": "2026-06-18T..."
  },
  "message": "宠物创建成功"
}
```

**实现要点**：
- 从当前登录用户获取 user_id。
- 根据 user.mbti + user.zodiac 生成 personality_type 字符串。
- 默认 stage='baby'，energy_level=80。
- 如果传入了 image_task_id，查询任务结果并使用 image_url。
- 否则使用默认占位图 URL。
- 写入 pets 表。

---

### API 4：附近宠物/用户发现

**路由**：`GET /api/explore/nearby`

**查询参数**：

```
lat: float, -90~90
lng: float, -180~180
radius: int, optional, default 5000 (meters)
limit: int, optional, default 20
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "pets": [
      {
        "pet_id": "...",
        "name": "...",
        "style": "anime",
        "stage": "baby",
        "distance": 120,
        "owner_nickname": "...",
        "intro": "一只喜欢在深夜思考人生的动漫小兽",
        "lat": 31.2304,
        "lng": 121.4737
      }
    ],
    "users": [
      {
        "user_id": "...",
        "nickname": "...",
        "mbti": "INFJ",
        "distance": 230,
        "lat": 31.2304,
        "lng": 121.4737
      }
    ]
  },
  "message": "success"
}
```

**实现要点**：
- 使用 PostGIS 或手动 Haversine 公式计算距离。
- 排除当前用户自己的宠物/账号。
- 位置精度模糊化为 3 位小数（约 100m），保护隐私。
- 返回结果按距离升序。
- 附近宠物 intro 使用 DeepSeek 根据宠物风格 + 主人 MBTI 动态生成。
- 如果没有真实数据，可生成 3-5 个虚拟附近宠物（标记为 `is_virtual: true`）作为冷启动填充，但需明确告知前端。

---

### API 5：Citywalk 攻略检索

**路由**：`POST /api/explore/citywalk/guides`

**请求体**：

```json
{
  "mbti": "INFJ",
  "zodiac": "摩羯座",
  "lat": 31.2304,
  "lng": 121.4737,
  "city": "上海",
  "radius": 3000,
  "limit": 3
}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "guides": [
      {
        "id": "uuid",
        "title": "INFJ 摩羯的深夜书店线",
        "tags": ["静", "思考", "咖啡", "历史"],
        "summary": "适合深夜独行的安静路线...",
        "duration": "2.5h",
        "distance": "3.2km",
        "pois": [
          {
            "name": "xx 书店",
            "type": "书店",
            "address": "...",
            "lat": 31.2304,
            "lng": 121.4737,
            "recommend_reason": "安静的阅读角落，适合 INFJ 独处充电"
          }
        ]
      }
    ]
  },
  "message": "success"
}
```

**实现要点**：

1. **真实 POI 检索**：
   - 调用高德地图 API 搜索附近 POI，关键词组合：书店、咖啡馆、美术馆、公园、老街、美食街等。
   - 按距离筛选，获取 10-15 个候选 POI。

2. **AI 攻略生成**：
   - 将 MBTI、星座、候选 POI 列表作为上下文。
   - 调用 DeepSeek API 生成 3 条 Citywalk 路线。
   - 每条路线包含标题、标签、简介、时长、距离、3-5 个 POI。
   - 每个 POI 附带推荐理由。

3. **缓存**：
   - 使用 Redis 缓存结果，key: `citywalk:{mbti}:{zodiac}:{city}:{lat_round}:{lng_round}`。
   - TTL: 24 小时。

4. **降级方案**：
   - 高德 API 失败时，使用城市默认热门 POI 列表。
   - DeepSeek 失败时，返回基于 POI 的简洁路线（无 MBTI 包装）。

**DeepSeek Prompt 示例**：

```
用户画像：MBTI=INFJ，星座=摩羯座，位置=上海。
请根据以下附近 POI 列表，生成 3 条适合该画像的 Citywalk 路线。
要求：
- 路线氛围安静、有深度、适合独处或少数朋友同行
- 包含吃、喝、玩、乐中的至少两类
- 每条路线 3-5 个 POI
- 用温柔的口吻写推荐理由

POI 列表：
{poi_list_json}
```

---

## 数据库 Schema 新增/调整

### users 表

```prisma
model User {
  id            String   @id @default(uuid())
  nickname      String?
  mbti          String?
  zodiac        String?
  privacy_level Int      @default(2)
  // ... 已有字段
}
```

### pets 表

```prisma
model Pet {
  id                 String   @id @default(uuid())
  user_id            String
  name               String
  personality_type   String?
  current_stage      String   @default("baby")
  stage_number       Int      @default(1)
  energy_level       Int      @default(80)
  max_energy         Int      @default(100)
  style              String
  custom_description String?
  image_url          String?
  action_closure_count Int    @default(0)
  // ... 已有字段
}
```

### image_generation_tasks 表（新增）

```prisma
model ImageGenerationTask {
  id          String   @id @default(uuid())
  user_id     String
  style       String
  prompt_used String?
  status      String   @default("pending") // pending, generating, completed, failed
  image_url   String?
  error_msg   String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

---

## 实现顺序

1. **Schema 调整**：更新 Prisma schema，新增 image_generation_tasks 表。
2. **API 1**：保存用户画像。
3. **API 3**：创建宠物。
4. **API 2**：AI 宠物形象生成（含任务表与轮询接口）。
5. **API 4**：附近宠物/用户发现。
6. **API 5**：Citywalk 攻略检索。
7. **单元测试**：核心服务函数测试。

---

## 验收标准

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| BACK-1 | 用户画像保存 | `POST /api/users/profile` 校验通过并持久化 |
| BACK-2 | AI 形象生成 | `POST /api/pets/generate-image` 创建任务，`GET /api/pets/generate-image/{task_id}` 可轮询结果 |
| BACK-3 | 宠物创建 | `POST /api/pets` 创建宠物并正确关联用户与图片任务 |
| BACK-4 | 附近发现 | `GET /api/explore/nearby` 返回按距离排序的宠物/用户，含虚拟填充逻辑 |
| BACK-5 | Citywalk 攻略 | `POST /api/explore/citywalk/guides` 基于真实 POI + DeepSeek 生成路线，含缓存 |
| BACK-6 | 错误处理 | 所有外部 API 失败有降级方案与清晰错误信息 |
| BACK-7 | 输入校验 | 所有接口使用 Pydantic 模型校验 |
| BACK-8 | 单元测试 | 核心服务函数至少 1 个测试 |

---

## 注意事项

1. **隐私保护**：位置信息返回前模糊化为 3 位小数（约 100m）。
2. **Supabase Storage**：生成的图片 URL 需要设置公开访问或签名 URL。
3. **SiliconFlow API**：配置在环境变量 `SILICONFLOW_API_KEY`。
4. **DeepSeek API**：配置在环境变量 `DEEPSEEK_API_KEY`。
5. **高德 API**：配置在环境变量 `AMAP_KEY`。
6. **异步生成**：如果 SD 生成较慢，首次接口只创建任务并返回 task_id，前端轮询结果。
7. **城市推断**：如果请求未传 city，根据 lat/lng 调用高德逆地理编码获取城市名。
8. **虚拟附近宠物**：冷启动时可生成虚拟宠物，但需标记 `is_virtual`，避免误导用户以为是真实用户。

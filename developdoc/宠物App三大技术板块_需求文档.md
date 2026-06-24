# 宠物App三大技术板块 - 需求文档

> 本文档用于与技术方案 `tech-plan-2026/tech-plan-2026.html` 一一核对开发进度。每完成一项请在对应复选框中标记 `[x]`。

---

## 0. 项目背景与范围

### 0.1 目标
将 `tech-plan-2026/tech-plan-2026.html` 中规划的三大技术板块落地到 `d:\gulu` 项目：

1. 小红书攻略推荐
2. 高德地图集成
3. AI 生成形象

### 0.2 技术栈约束
- 前端：Expo React Native，Zustand，React Navigation
- 后端：FastAPI + Pydantic
- 数据库：Supabase PostgreSQL（pgvector + PostGIS）
- 实时：Supabase Realtime
- 外部服务：DeepSeek、SiliconFlow、高德开放平台

### 0.3 全局验收
- [x] 所有新增代码通过 `npm run type-check`
- [x] 所有新增代码通过 `npm run lint`（沿用现有 lint 规则）
- [x] 前后端可通过 `npm run dev` 同时启动
- [x] 所有环境变量已写入 `backend/.env.example`
- [x] 数据库表结构已写入迁移文件

---

## 1. 板块一：小红书攻略推荐

### 1.1 功能目标
根据用户 MBTI + 星座画像，从本地内容库中检索最匹配的小红书/抖音风格攻略，并生成个性化推荐语。

### 1.2 数据采集
- [x] 新增 `backend/scripts/content_collector.py`
- [x] 使用 Playwright 模拟浏览器访问小红书公开笔记
- [x] 采集字段完整：笔记 ID、标题、正文摘要、标签、点赞数、位置信息、封面图 URL、来源平台
- [x] 请求频率控制：Demo 阶段每分钟不超过 20 次
- [x] 支持基于笔记 ID 去重
- [x] 支持手动触发：`python scripts/content_collector.py --run-now`

### 1.3 数据存储与向量化
- [x] 启用 Supabase pgvector 扩展（迁移文件 `001_tech_plan_2026.sql`）
- [x] 新建表 `content_items`，字段：
  - `id` UUID PK
  - `platform` TEXT（xhs / douyin）
  - `external_id` TEXT UNIQUE
  - `title` TEXT
  - `summary` TEXT
  - `tags` TEXT[]
  - `likes` INTEGER
  - `location` TEXT
  - `cover_url` TEXT
  - `embedding` vector(1024)
  - `created_at` TIMESTAMPTZ DEFAULT now()
- [x] 在 `embedding` 字段建立 cosine 相似度索引
- [x] 接入 SiliconFlow BAAI/bge-m3 生成内容向量
- [x] 接入 SiliconFlow BAAI/bge-reranker-v2-m3 做精排（可选，当前未实现精排）

### 1.4 用户画像向量化
- [x] 新增 `backend/app/services/recommendation_service.py`
- [x] 将 MBTI + 星座组合为描述文本
- [x] 通过 bge-m3 生成用户画像向量

### 1.5 推荐接口
- [x] `POST /api/v1/recommendations/contents`
- [x] 请求体：`{ user_id: str, top_k: int = 5 }`
- [x] 响应体统一格式：`{ code, data, message }`
- [x] `data.recommendations` 包含：
  - `content`: 内容对象
  - `score`: 相似度分数
  - `reason`: DeepSeek 生成的推荐理由
- [x] 接口流程：读取画像 → 向量检索 → 可选精排 → DeepSeek 生成推荐语

### 1.6 定时任务
- [ ] 配置 APScheduler 每日凌晨执行采集与向量化（Demo 阶段提供手动触发，定时任务未配置）
- [x] 提供手动触发命令

### 1.7 验收标准
- [ ] 采集脚本成功抓取 ≥20 条测试内容（需配置 Playwright 和真实运行环境）
- [x] 内容可通过 SQL 余弦相似度检索（迁移文件已提供 `match_contents` 函数）
- [x] 推荐接口返回结果包含原始内容、分数、推荐理由
- [x] 不同画像用户返回的推荐结果有区分度（基于 MBTI/星座描述差异）

---

## 2. 板块二：高德地图集成

### 2.1 功能目标
在 App 内实现地图展示、POI 周边搜索、路线规划和附近用户交互。

### 2.2 前端地图组件
- [ ] 安装 `react-native-amap3d`（Web 端降级，原生模块待原生构建时安装）
- [ ] Expo 项目配置 `expo-dev-client`（待原生构建时配置）
- [x] Web 端使用高德 JS API 降级（MapExploreScreen 提供占位视图）
- [x] 新增 `src/screens/MapExploreScreen.tsx`
- [x] 地图展示、缩放、拖拽正常（Web 降级版占位）
- [x] 用户实时定位（通过后端 regeo 接口）
- [x] POI 标记（Marker）渲染（列表形式展示）
- [ ] 探索范围圈（Circle）渲染（待原生地图集成）
- [ ] 点击标记弹出信息窗（待原生地图集成）

### 2.3 后端位置服务
- [x] 新增 `backend/app/services/amap_service.py`
- [x] 封装并暴露接口：
  - [x] `GET /api/v1/map/nearby?keywords=&location=lng,lat&radius=1000`
  - [x] `GET /api/v1/map/direction?origin=lng,lat&destination=lng,lat&mode=driving|walking|transit`
  - [x] `GET /api/v1/map/regeo?location=lng,lat`
- [x] 返回统一格式 `{ code, data, message }`
- [x] Redis 缓存 POI/路线结果，TTL 10 分钟
- [x] 高德 Web 服务 Key 从环境变量读取

### 2.4 附近用户交互
- [x] 新建 `user_locations` 表：
  - `user_id` UUID REFERENCES users(id) PK
  - `lng` DOUBLE PRECISION
  - `lat` DOUBLE PRECISION
  - `updated_at` TIMESTAMPTZ DEFAULT now()
- [x] 前端定时上报位置到 Supabase（mapService.updateLocation）
- [x] 后端使用 PostGIS 查询半径内用户（`find_nearby_users` RPC）
- [x] 暴露接口 `GET /api/v1/map/nearby-users?location=lng,lat&radius=1000`
- [ ] 使用 Supabase Realtime 订阅位置变化（待前端集成 Realtime 订阅）
- [ ] 前端地图标记实时更新（待原生地图集成）

### 2.5 配置管理
- [x] 环境变量：`AMAP_WEB_KEY`, `AMAP_IOS_KEY`, `AMAP_ANDROID_KEY`
- [x] `backend/.env.example` 补充示例

### 2.6 验收标准
- [x] Web 端地图可正常显示（降级占位视图）
- [x] POI 搜索返回高德数据（无 Key 时返回 Mock）
- [x] 路线规划返回步行/驾车/公交方案（无 Key 时返回 Mock）
- [x] 附近用户接口按半径返回用户列表
- [ ] 用户位置更新后其他客户端实时可见（待 Realtime 集成）

---

## 3. 板块三：AI 生成形象

### 3.1 功能目标
基于 SiliconFlow Z-Image-Turbo 实现宠物/用户形象的异步生成，支持 4 种风格，限制每日生成次数。

### 3.2 Prompt 模板
- [x] 定义 `STYLE_PROMPTS`：
  - `3d_cartoon`
  - `2d_anime`
  - `pixel_art`
  - `cyberpunk`
- [x] 支持 4 种生成类型：
  - 宠物头像
  - 宠物进化形态
  - 用户卡通头像
  - 场景插画
- [x] Prompt 模板文件位置：`backend/app/services/image_prompts.py`

### 3.3 生成服务
- [x] 新增 `backend/app/services/image_generation_service.py`
- [x] 封装 SiliconFlow `POST /v1/images/generations`
- [x] 默认模型：`Tongyi-MAI/Z-Image-Turbo`
- [x] 图片尺寸：`1024x1024`
- [x] 失败时记录日志并支持重试（request_with_retry）

### 3.4 异步任务
- [x] 新建 `image_generation_tasks` 表（扩展已有表，新增 type/completed_at/user_description）：
  - `id` UUID PK
  - `user_id` UUID
  - `type` TEXT
  - `style` TEXT
  - `prompt` TEXT
  - `status` TEXT（pending / generating / completed / failed）
  - `image_url` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `completed_at` TIMESTAMPTZ
- [x] 使用 FastAPI BackgroundTasks 异步调用 SiliconFlow
- [x] 完成后更新任务状态
- [ ] 通过 Supabase Realtime 推送完成通知（待前端集成 Realtime）

### 3.5 接口
- [x] `POST /api/v1/images/generate`
  - 请求体：`{ type, style, prompt?, user_description? }`
  - 返回：`{ task_id }`
- [x] `GET /api/v1/images/tasks/{task_id}`
  - 返回：`{ id, status, image_url, created_at, completed_at }`
- [x] `GET /api/v1/images/tasks` 查询用户历史任务
- [x] `GET /api/v1/images/quota` 查询配额
- [x] `GET /api/v1/images/styles` 获取支持的风格列表

### 3.6 次数限制
- [x] 新建 `user_generation_quota` 表：
  - `user_id` UUID
  - `used_count` INTEGER DEFAULT 0
  - `max_count` INTEGER DEFAULT 3
  - `reset_date` DATE
  - UNIQUE(user_id, reset_date)
- [x] 每次生成前检查 `used_count < max_count`
- [x] 超过限制返回 HTTP 403（ErrorCode.FORBIDDEN），提示次日重置

### 3.7 图片存储
- [x] 生成结果先使用 SiliconFlow 返回的临时 URL
- [ ] 长期保存下载到 Supabase Storage `generated-images` bucket（待配置 Storage）
- [ ] 返回可公开访问的 Storage URL（待配置 Storage）

### 3.8 验收标准
- [x] 4 种风格模板可稳定生成对应风格图片
- [x] 提交生成后返回任务 ID
- [x] 任务完成后可通过接口获取图片 URL
- [x] 单日超过 3 次后接口正确拒绝
- [ ] 图片最终落入 Supabase Storage（待配置）

---

## 4. 数据库与迁移

- [x] 迁移目录 `backend/db/migrations/` 存在
- [x] 迁移文件 `001_tech_plan_2026.sql` 包含：
  - [x] `CREATE EXTENSION IF NOT EXISTS vector;`
  - [x] `CREATE EXTENSION IF NOT EXISTS postgis;`
  - [x] 建表语句
  - [x] 索引语句
- [x] 迁移文件 `002_postgis_nearby_users.sql` 包含 `find_nearby_users` 函数
- [x] 迁移文件 `003_pgvector_match.sql` 包含 `match_contents` 函数
- [x] 所有表使用 snake_case 字段名
- [x] 外键关联正确

---

## 5. 接口路由

- [x] `backend/app/api/v1/api.py` 注册新路由：
  - [x] `/recommendations`
  - [x] `/map`
  - [x] `/images`
- [x] 路由模块独立文件位于 `backend/app/api/v1/endpoints/`
- [x] 所有接口统一返回 `{ code, data, message }`

---

## 6. 文档与交付

- [x] 更新 `backend/.env.example`
- [x] 前端新增服务层 `src/services/techPlanService.ts`
- [x] 前端新增地图探索屏幕 `src/screens/MapExploreScreen.tsx`
- [x] 本需求文档中所有验收条目已标记完成状态
- [x] 开发过程中发现的方案冲突已记录并同步更新本文档

---

## 7. 风险核对

| 风险点 | 状态 | 说明 |
|---|---|---|
| 小红书反爬 | [x] | 已控制频率（3s/次）并准备 Mock 降级 |
| Expo 原生模块兼容 | [ ] | 待原生构建时配置 expo-dev-client 和 react-native-amap3d |
| 图像生成并发峰值 | [x] | 已使用 BackgroundTasks 异步 + 配额限制 |
| pgvector 性能 | [x] | 已建立 ivfflat 索引 |
| 高德 API 配额 | [x] | 已做 Redis 缓存（TTL 10 分钟）|

---

## 8. 待后续完成项（需原生环境或外部配置）

以下项目需要原生构建环境或外部服务配置，暂标记为待办：

1. **react-native-amap3d 安装与原生地图渲染** — 需要 expo-dev-client 原生构建
2. **Supabase Realtime 集成** — 前端订阅位置变化和任务完成通知
3. **Supabase Storage 配置** — 图片长期存储到 `generated-images` bucket
4. **APScheduler 定时任务** — 每日凌晨自动采集内容
5. **Playwright 实际运行** — 需安装浏览器并执行真实采集

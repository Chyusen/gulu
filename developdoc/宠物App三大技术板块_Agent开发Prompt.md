# 宠物App三大技术板块 - Agent 开发 Prompt

## 1. 角色与任务

你是一名全栈开发工程师，负责将 `tech-plan-2026/tech-plan-2026.html` 中规划的三大技术板块落地到 `d:\gulu` 项目：

1. **小红书攻略推荐**（爬虫采集 + RAG 向量检索）
2. **高德地图集成**（前端 SDK + 后端 Web 服务 API）
3. **AI 生成形象**（SiliconFlow Z-Image-Turbo 异步生成）

开发过程中必须逐一与 `developdoc/宠物App三大技术板块_需求文档.md` 核对，每完成一个子功能就在需求文档对应条目标记完成状态。

## 2. 项目背景与技术栈

- **前端**：Expo React Native（Web / iOS / Android），Zustand 状态管理，React Navigation
- **后端**：Python FastAPI + Pydantic
- **数据库**：Supabase PostgreSQL，pgvector 扩展，PostGIS
- **实时**：Supabase Realtime
- **外部服务**：DeepSeek、SiliconFlow、高德开放平台
- **任务队列**：Redis + 自定义异步任务（Demo 阶段可用 FastAPI BackgroundTasks）
- **包管理**：前端 npm，后端 Python 依赖由 `backend/requirements.txt` 管理

## 3. 通用开发规范

### 3.1 代码规范

- TypeScript 严格模式；后端 Python 类型注解完整
- 新增 API 统一返回 `{ code: number, data: any, message: string }`
- 所有环境变量写入 `backend/.env.example`，禁止提交真实密钥
- 数据库表/字段命名使用 snake_case；Pydantic 模型使用 camelCase 或 snake_case 与现有代码保持一致
- 新增脚本必须可独立运行，且附带 `--help` 或注释说明用法

### 3.2 错误与降级

- 外部 API（高德、SiliconFlow、DeepSeek）失败时必须有降级逻辑，不得阻塞主流程
- Demo 模式下若 Supabase 不可用，自动回退到内存/JSON 存储
- 所有异步任务需记录失败原因，支持重试

### 3.3 测试与验证

- 每完成一个板块必须在本地启动前后端（`npm run dev`）并通过浏览器验证
- 涉及地图的改动优先在 Web 端验证；原生功能需说明模拟/跳过方案
- 修改后必须运行 `npm run type-check` 和 `npm run lint`

## 4. 板块一：小红书攻略推荐

### 4.1 目标

根据用户 MBTI + 星座画像，从本地内容库中检索最匹配的小红书/抖音风格攻略，并生成个性化推荐语。

### 4.2 关键实现要求

1. **数据采集**
   - 在 `backend/scripts/` 新增 `xhs_collector.py` 或 `content_collector.py`
   - 使用 Playwright 模拟浏览器采集小红书公开笔记
   - 采集字段：笔记 ID、标题、正文摘要、标签、点赞数、位置信息、封面图 URL、来源平台
   - 控制频率：Demo 阶段每分钟不超过 20 次请求
   - 支持基于笔记 ID 去重

2. **数据存储与向量化**
   - 新建 Supabase 表 `content_items`：
     - `id`, `platform`, `external_id`, `title`, `summary`, `tags`, `likes`, `location`, `cover_url`, `embedding`, `created_at`
   - 启用 pgvector，embedding 字段类型为 `vector(1024)` 或模型对应维度
   - 使用 BAAI/bge-m3 通过 SiliconFlow 免费接口生成文本向量
   - 在 `embedding` 字段建立 cosine 相似度索引

3. **用户画像向量化**
   - 在 `backend/app/services/` 新增 `recommendation_service.py`
   - 将 MBTI + 星座组合为描述文本，例如：
     - `"INFP 双鱼座用户，敏感细腻，喜欢城市漫步、艺术氛围和小众打卡点"`
   - 通过同一 embedding 模型生成用户画像向量

4. **推荐接口**
   - `POST /api/v1/recommendations/contents`
   - 请求体：`{ user_id: str, top_k: int = 5 }`
   - 流程：
     1. 读取用户画像
     2. 向量相似度检索 top_k 内容
     3. 可选：使用 bge-reranker-v2-m3 做二次精排
     4. 调用 DeepSeek 为每条结果生成一句个性化推荐语
   - 响应包含：`{ recommendations: [{ content, score, reason }] }`

5. **定时任务**
   - 在 `backend/main.py` 或独立脚本中配置 APScheduler
   - 每日凌晨执行一次内容采集与向量化
   - Demo 阶段提供手动触发命令：
     ```bash
     cd backend && python scripts/content_collector.py --run-now
     ```

### 4.3 验收标准

- [ ] 采集脚本能成功抓取至少 20 条测试内容并存入数据库
- [ ] 内容向量化后可通过 SQL 进行余弦相似度检索
- [ ] 推荐接口返回结果包含原始内容、相似度分数和 DeepSeek 生成的推荐理由
- [ ] 推荐结果在用户画像变化后能体现差异

## 5. 板块二：高德地图集成

### 5.1 目标

在 App 内实现地图展示、POI 周边搜索、路线规划和附近用户交互。

### 5.2 关键实现要求

1. **前端地图组件**
   - 安装 `react-native-amap3d`
   - 因涉及原生模块，Expo 项目需使用 `expo-dev-client`
   - Web 端使用高德 JS API 作为降级方案
   - 新增屏幕 `src/screens/MapExploreScreen.tsx`：
     - 地图展示、缩放、拖拽
     - 用户实时定位
     - POI 标记（Marker）渲染
     - 探索范围圈（Circle）

2. **后端位置服务**
   - 在 `backend/app/services/` 新增 `amap_service.py`
   - 封装高德 Web 服务 API：
     - `GET /api/v1/map/nearby?keywords=&location=lng,lat&radius=1000`
     - `GET /api/v1/map/direction?origin=lng,lat&destination=lng,lat&mode=driving|walking|transit`
     - `GET /api/v1/map/regeo?location=lng,lat`
   - 结果做 Redis 缓存，TTL 10 分钟

3. **附近用户交互**
   - 用户位置通过 `react-native-amap3d` 获取后，定时上报到 Supabase `user_locations` 表
   - 表结构：
     - `user_id`, `lng`, `lat`, `updated_at`
   - 后端使用 PostGIS 查询半径内用户：
     - `GET /api/v1/map/nearby-users?location=lng,lat&radius=1000`
   - 通过 Supabase Realtime 订阅位置变化，前端实时更新地图标记

4. **配置管理**
   - 高德 Key 写入环境变量：`AMAP_WEB_KEY`, `AMAP_IOS_KEY`, `AMAP_ANDROID_KEY`
   - `.env.example` 中补充示例值

### 5.3 验收标准

- [ ] Web 端地图可正常显示（JS API 降级）
- [ ] 后端 POI 搜索接口返回符合预期的高德数据
- [ ] 路线规划接口返回步行/驾车/公交方案
- [ ] 附近用户接口能根据坐标返回半径内用户列表
- [ ] 用户位置更新后，其他客户端能在地图上看到实时变化

## 6. 板块三：AI 生成形象

### 6.1 目标

基于 SiliconFlow Z-Image-Turbo 实现宠物/用户形象的异步生成，支持 4 种风格，限制每日生成次数。

### 6.2 关键实现要求

1. **Prompt 模板**
   - 在 `backend/app/core/prompts.py` 或 `backend/app/services/image_prompts.py` 中定义：
     ```python
     STYLE_PROMPTS = {
         "3d_cartoon": "3D cartoon style, Pixar-like, soft lighting, vibrant colors, cute and adorable",
         "2d_anime": "2D anime style, Japanese animation, cel shading, expressive eyes",
         "pixel_art": "pixel art style, 16-bit retro game aesthetic, limited color palette",
         "cyberpunk": "cyberpunk style, neon lights, futuristic, dark atmosphere",
     }
     ```
   - 支持宠物头像、宠物进化形态、用户卡通头像、场景插画 4 种生成类型

2. **生成服务**
   - 在 `backend/app/services/` 新增 `image_generation_service.py`
   - 封装 SiliconFlow `POST /v1/images/generations`
   - 默认模型：`Tongyi-MAI/Z-Image-Turbo`
   - 图片尺寸：`1024x1024`

3. **异步任务与队列**
   - 用户提交请求后，后端创建 `image_generation_tasks` 记录：
     - `id`, `user_id`, `type`, `style`, `prompt`, `status`, `image_url`, `created_at`, `completed_at`
   - 使用 FastAPI BackgroundTasks 或 Redis 队列异步调用 SiliconFlow
   - 完成后更新任务状态，并通过 Supabase Realtime 推送通知
   - 接口：
     - `POST /api/v1/images/generate`
     - `GET /api/v1/images/tasks/{task_id}`

4. **次数限制**
   - 新建表 `user_generation_quota`：
     - `user_id`, `used_count`, `max_count`, `reset_date`
   - 每次生成前检查 `used_count < max_count`（默认 3 次/天）
   - 超过限制返回 `403` 并提示次日重置

5. **图片存储**
   - 生成的图片 URL 可暂存 SiliconFlow 返回的临时链接
   - 长期保存时下载到 Supabase Storage 的 `generated-images` bucket

### 6.3 验收标准

- [ ] 4 种风格的 Prompt 模板能稳定生成对应风格图片
- [ ] 生成接口返回任务 ID，任务完成后可通过轮询或 Realtime 获取图片 URL
- [ ] 单日生成超过 3 次后接口正确拒绝
- [ ] 图片文件最终落入 Supabase Storage 并返回可访问 URL

## 7. 数据库变更统一要求

- 所有表结构变更写入 `backend/supabase/migrations/` 或 `backend/migrations/`
- 若项目未建立迁移目录，则创建并写入 `001_tech_plan_2026.sql`
- 迁移文件必须包含：建表、索引、pgvector/PostGIS 扩展启用语句

## 8. 接口路由注册

- 在 `backend/app/api/v1/api.py` 中注册新路由：
  - `/recommendations`
  - `/map`
  - `/images`
- 每个路由模块独立文件，位于 `backend/app/api/v1/endpoints/`

## 9. 文档与核对

- 开发过程中随时参考 `developdoc/宠物App三大技术板块_需求文档.md`
- 每完成一个验收条目，在需求文档中标记 `[x]`
- 若发现需求文档与技术方案冲突，以本 Prompt 和 `tech-plan-2026/tech-plan-2026.html` 为准，并同步更新需求文档

## 10. 禁止事项

- 不得提交真实 API Key 到代码仓库
- 不得在未做降级的场景下直接调用外部付费 API
- 不得破坏现有引导流程、主界面和宠物核心机制
- 不得引入与现有技术栈不兼容的大型框架

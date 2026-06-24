# 咕噜 Gulu — 三大技术板块 Demo 开发清单

> 对应技术方案 `tech-plan-2026/tech-plan-2026.html`
> 适用于 Demo 阶段：功能走通、接口预留、资产精简、UI 复用

---

## 一、AI 形象生成功能定位

### 1.1 使用场景

AI / 自定义形象功能**不在主界面常驻入口**，只在以下两个场景出现：

1. **引导流程 — 降生阶段**：用户从 4 种风格中选择 1 种，作为宠物初始形象。
2. **主界面 — 星尘更换形象**：用户花费 300 星尘更换宠物形象，更换后宠物回到幼崽期。

### 1.2 降生阶段风格选择

- 引导流程 `PetCreateStep` 中已有风格选择，当前为 7 种，需**砍为 4 种**。
- 用户**只从 4 种风格里选择 1 种**。
- 选择后，宠物的**幼崽期、伴生期、觉醒期**均按该风格渲染。
- 不需要在降生阶段展示三阶段预览，只需要展示 4 个风格卡片。

**4 种风格与代码标签映射：**

| 展示名称 | 代码标签 | 说明 |
|---|---|---|
| 2D 动漫 | `anime` | 保留现有标签 |
| 3D 卡通 | `realistic` | 复用现有 `realistic` 标签，展示名改为 3D 卡通 |
| 像素风 | `pixel` | 保留现有标签 |
| 赛博朋克 | `scifi` | 复用现有 `scifi` 标签，展示名改为赛博朋克 |

**砍掉的 3 种风格：** `ink`（水墨）、`vaporwave`（蒸汽波）、`sketch`（素描）

### 1.3 自定义上传形象

- Demo 阶段：用户上传一张角色全身图后，**直接用这张图作为宠物形象**，不走 AI 生成流程。
- 后端 `POST /images/generate` 接口**已预留**，后续可接入 SiliconFlow 图生图能力。
- 前端上传入口文案：`"上传你喜欢的角色全身图，它将作为你的咕噜伙伴"`。

### 1.4 星尘更换形象规则

- **入口位置**：主界面左上角点击宠物头像后弹出的 `PetDetailPanel` 面板底部，新增"更换形象"按钮。
- **消耗**：300 星尘 / 次。
- **Demo 阶段**：测试用户默认拥有足够星尘，方便反复体验。
- **更换后重置项**：
  - 外观形象
  - 等级
  - 经验
  - 心情
  - 体力
  - 亲密度
  - 进化进度
  - 记忆
- **保留项**：性格

### 1.5 更换形象提示文案

入口按钮旁常驻提示：

```text
更换形象需消耗 300 星尘，更换后宠物将回到幼崽期，
等级、经验、心情、体力、亲密度、进化进度和记忆都会重置，
性格将保持不变。
```

二次确认弹窗标题：

```text
确定要更换形象吗？
```

二次确认弹窗内容：

```text
你的伙伴将重新开始成长，过去的点滴回忆会被温柔封存。
是否确认消耗 300 星尘更换形象？
```

按钮文案：

- 取消：`"再想想"`
- 确认：`"确认更换（300 星尘）"`

余额不足提示：

```text
星尘不足，可通过完成周任务或后续充值获得。
```

---

## 二、前后端 API 清单

### 2.1 已完成后端接口（可直接使用）

| 模块 | 方法 | 接口 | 用途 | Demo 状态 |
|---|---|---|---|---|
| AI 生成 | POST | `/api/v1/images/generate` | 提交生成任务 | 已接入，返回 task_id |
| AI 生成 | GET | `/api/v1/images/tasks/{id}` | 查询任务状态 | 已接入 |
| AI 生成 | GET | `/api/v1/images/tasks` | 用户历史任务 | 已接入 |
| AI 生成 | GET | `/api/v1/images/quota` | 当日配额 | 已接入 |
| AI 生成 | GET | `/api/v1/images/styles` | 风格 / 类型列表 | 已接入 |
| 地图 | GET | `/api/v1/map/nearby` | POI 周边搜索 | 已接入，无 Key 时 Mock 降级 |
| 地图 | GET | `/api/v1/map/direction` | 路线规划 | 已接入，无 Key 时 Mock 降级 |
| 地图 | GET | `/api/v1/map/regeo` | 逆地理编码 | 已接入 |
| 地图 | POST | `/api/v1/map/location` | 上报用户位置 | 已接入 |
| 地图 | GET | `/api/v1/map/nearby-users` | 查询附近用户 | 已接入 |
| 推荐 | POST | `/api/v1/recommendations/contents` | 个性化推荐 | 已接入，需填充 Mock 数据 |
| 推荐 | GET | `/api/v1/recommendations/contents/list` | 内容列表 | 已接入 |

### 2.2 前端需配套调用的接口

| 模块 | 前端页面 | 调用接口 |
|---|---|---|
| AI 生成 | 降生阶段风格选择页 | `GET /images/styles` |
| 自定义上传 | 降生阶段 / 更换形象页 | 直接上传图片到前端本地或 Storage，无需调用生成接口 |
| 星尘更换 | 主界面设置面板或独立入口 | 调用货币扣除逻辑 + 重置宠物状态 |
| 地图 | `MapExploreScreen` | `GET /map/nearby`、`POST /map/location`、`GET /map/nearby-users` |
| 推荐 | `MapExploreScreen` / 推荐弹窗 | `POST /recommendations/contents` |

### 2.3 预留待后续实现

| 模块 | 能力 | 当前状态 |
|---|---|---|
| AI 生成 | SiliconFlow 真实图生图 | 仅接口 `POST /images/generate` 已留好 |
| AI 生成 | Supabase Realtime 任务完成推送 | 仅接口结构预留 |
| 地图 | WebSocket / Realtime 位置实时同步 | 仅接口结构预留 |
| 地图 | 高德 JS API Web 端真实地图 | 仅后端 API 已留好 |
| 推荐 | APScheduler 每日自动采集 | 仅脚本已留好 |

---

## 三、Demo 资产清单

### 3.1 需要重新生成的资产（新宠物形象）

Demo 只需要 **4 种风格 × 3 阶段 × 2 种核心状态（正常 + 灰化）= 24 张 PNG**。

| 资产 | 数量 | 格式 | 尺寸 | 比例 | 背景 | 命名示例 |
|---|---|---|---|---|---|---|
| 幼崽期正常形象 | 4 | PNG | 1024×1024 | 1:1 | 透明 | `pet_baby_3d_cartoon_normal.png` |
| 幼崽期灰化形象 | 4 | PNG | 1024×1024 | 1:1 | 透明 | `pet_baby_3d_cartoon_graying.png` |
| 伴生期正常形象 | 4 | PNG | 1024×1024 | 1:1 | 透明 | `pet_adult_3d_cartoon_normal.png` |
| 伴生期灰化形象 | 4 | PNG | 1024×1024 | 1:1 | 透明 | `pet_adult_3d_cartoon_graying.png` |
| 觉醒期正常形象 | 4 | PNG | 1024×1024 | 1:1 | 透明 | `pet_divine_3d_cartoon_normal.png` |
| 觉醒期灰化形象 | 4 | PNG | 1024×1024 | 1:1 | 透明 | `pet_divine_3d_cartoon_graying.png` |

**存放路径：**

```
src/assets/images/pets/{stage}/{style}/pet_{stage}_{style}_{state}.png
```

**风格后缀映射：**

| 中文名称 | 文件后缀 |
|---|---|
| 3D 卡通 | `_3d_cartoon` |
| 2D 动漫 | `_anime` |
| 像素风 | `_pixel` |
| 赛博朋克 | `_cyberpunk` |

**阶段后缀映射：**

| 中文名称 | 文件后缀 |
|---|---|
| 幼崽期 | `baby` |
| 伴生期 | `adult` |
| 觉醒期 | `divine` |

### 3.2 可复用的现有资产

| 类别 | 现有路径 | 说明 |
|---|---|---|
| UI 图标 | `src/assets/images/ui/icons/` | 16+ 个 SVG 图标，24/48 两套 |
| 背景图 | `src/assets/images/ui/backgrounds/` | 首页/对话/个人中心/加载背景 |
| 场景背景 | `src/assets/images/scenes/` | 6 张小窝场景 |
| 礼物素材 | `src/assets/images/gifts/` | 5 种社交礼物 |
| 音效 | `src/assets/audio/sfx/` | 点击/抚摸/喂食/进化等 |
| 背景音乐 | `src/assets/audio/music/` | 首页/对话/Citywalk/进化等 |
| Lottie 动画 | `src/assets/animations/lottie/` | 呼吸/进食/进化/加载等 |
| 语音 | `src/assets/audio/voice/` | 5 种音色 × 8 种情感 |

### 3.3 Demo 不需要生成的资产

- 皮肤 / 挂件
- 新场景背景
- 新图标
- 新音频 / 音乐 / 语音
- 粒子特效（代码实现）
- 休眠 / 开心 / 悲伤状态变体（用 CSS filter 或 Lottie 动画替代）

---

## 四、AI 生成占位图处理方案

Demo 阶段 `POST /images/generate` 流程**只走流程，不实际出图**。自定义上传图则直接作为宠物形象。

### 4.1 降生阶段 / 更换形象时的自定义上传

1. 用户点击"上传角色图"。
2. 选择本地图片后，前端直接保存到本地状态或临时 URL。
3. 点击确认后，该图片作为宠物形象，进入主界面。
4. 文案提示：`"这是 Demo 占位方案，正式上线后将支持 AI 根据你的图片生成专属形象。"`

### 4.2 若用户走 AI 生成流程（预留入口）

1. 前端点击"AI 生成"按钮 → 调用 `POST /images/generate` → 显示"正在生成..." → 轮询 `GET /images/tasks/{id}`。
2. 任务完成后 → 返回一张已有的宠物占位图（例如幼崽期默认形象）。
3. 图片下方或弹窗显示文案：
   - 主文案：`"AI 形象定制功能即将上线，当前为演示占位图"`
   - 备选：`"该功能暂未开放，敬请期待 ~"`
4. 单日超过 3 次 → 接口返回 403，前端显示：
   - `"今日生成次数已用完，明日再来吧"`

---

## 五、宠物形象 Prompt 清单

### 5.1 基础设定

- 三阶段：幼崽期（baby）→ 伴生期（adult）→ 觉醒期（divine）
- 四种风格：3D 卡通、2D 动漫、像素风、赛博朋克
- 所有形象基于统一生物原型：猫科幻想生物，紫色 + 金色主色调

### 5.2 伴生期通用 Prompt

伴生期为幼崽向觉醒过渡的青少年形态，体型更修长，开始长出水晶角、半透明翅膀或能量光环，但气场尚未完全成熟。

```text
A growing adolescent fantasy creature, transitioning from baby to divine form,
slender yet still cute body, small budding crystal horns, faint translucent
wings or aura starting to emerge, soft purple and gold highlights, curious
and gentle expression, transparent background, full body, detailed --ar 1:1
```

### 5.3 四种风格 × 三阶段 Prompt

#### 3D 卡通风格（Pixar-like）

**幼崽期：**
```text
A cute fluffy baby cat-like fantasy creature, big sparkling eyes, soft pastel
purple and white colors, round chubby body, small paws, transparent background,
3D cartoon style, Pixar-like, soft lighting, full body, clean lines, high
quality, detailed --ar 1:1
```

**伴生期：**
```text
A growing adolescent fantasy creature, transitioning from baby to divine form,
slender body, small crystal horns, faint translucent wings emerging, purple
and gold highlights, gentle curious expression, transparent background,
3D cartoon style, Pixar-like, soft lighting, full body, detailed --ar 1:1
```

**觉醒期：**
```text
A majestic adult fantasy creature with golden wings and glowing aura, powerful
but gentle expression, purple and gold color scheme, long flowing mane, crystal
horns, transparent background, 3D cartoon style, Pixar-like, epic lighting,
full body, detailed --ar 1:1
```

#### 2D 动漫风格

**幼崽期：**
```text
A cute fluffy baby cat-like fantasy creature, big sparkling anime eyes, soft
pastel purple and white colors, round chubby body, small paws, transparent
background, 2D illustration, kawaii anime style, full body, clean lines,
high quality, detailed --niji 5 --ar 1:1
```

**伴生期：**
```text
A growing adolescent fantasy creature, transitioning from baby to divine form,
slender anime proportions, small crystal horns, faint translucent wings,
purple and gold aura, gentle curious expression, transparent background,
2D illustration, anime style, full body, detailed --niji 5 --ar 1:1
```

**觉醒期：**
```text
A majestic adult fantasy creature with golden wings and glowing aura, powerful
but gentle expression, purple and gold color scheme, long flowing mane, crystal
horns, transparent background, 2D illustration, epic anime style, full body,
detailed --niji 5 --ar 1:1
```

#### 像素风

**幼崽期：**
```text
A cute fluffy baby cat-like fantasy creature, big sparkling pixel eyes, soft
pastel purple and white colors, round chubby body, small paws, transparent
background, pixel art style, 16-bit retro game aesthetic, full body, clean
pixels, detailed --ar 1:1
```

**伴生期：**
```text
A growing adolescent fantasy creature, transitioning from baby to divine form,
slender pixel proportions, small crystal horns, faint translucent wings,
purple and gold highlights, gentle expression, transparent background,
pixel art style, 16-bit, full body, detailed --ar 1:1
```

**觉醒期：**
```text
A majestic adult fantasy creature with golden wings and glowing aura, powerful
but gentle expression, purple and gold color scheme, long flowing mane, crystal
horns, transparent background, pixel art style, 16-bit, epic, full body,
detailed --ar 1:1
```

#### 赛博朋克风格

**幼崽期：**
```text
A cute fluffy baby cat-like fantasy creature, big glowing cybernetic eyes,
soft neon purple and white colors, round chubby body, small paws, transparent
background, cyberpunk style, neon lights, holographic elements, full body,
detailed --ar 1:1
```

**伴生期：**
```text
A growing adolescent fantasy creature, transitioning from baby to divine form,
slender cybernetic body, small crystal horns with neon glow, faint holographic
wings, purple and gold neon highlights, curious expression, transparent
background, cyberpunk style, neon lights, full body, detailed --ar 1:1
```

**觉醒期：**
```text
A majestic adult fantasy creature with golden neon wings and glowing digital
aura, powerful but gentle expression, purple and gold neon color scheme, long
flowing mane, crystal horns with circuit patterns, transparent background,
cyberpunk style, neon lights, futuristic, full body, detailed --ar 1:1
```

### 5.4 灰化状态变体 Prompt

对每种风格的基础 Prompt，追加以下后缀：

```text
, same creature but graying, desaturated colors, dark thorns growing on body,
sluggish posture, melancholic expression, transparent background, {style},
full body --ar 1:1
```

---

## 六、Mock 推荐数据与地图 POI 对应

### 6.1 Demo 固定区域

- **地图中心点**：北京南锣鼓巷 / 什刹海 / 鼓楼区域
- **默认坐标**：`116.3940,39.9420`
- **地图实现**：接入高德 JS API Web 端，使用 `AMAP_WEB_KEY`
- **Mock 附近用户数量**：15 个虚拟用户
- **Mock 推荐内容数量**：20 条

### 6.2 数据设计原则

- 推荐内容必须带有 `location` 字段（`经度,纬度`）。
- 内容的标题 / 摘要围绕南锣鼓巷、什刹海、鼓楼附近的 POI 编写。
- 前端点击推荐卡片时，可携带 `location` 跳转到 `MapExploreScreen`，并在 POI 列表中高亮。
- 所有地图、POI、附近用户、推荐内容均为 Mock 数据，后端真实接口已预留。

### 6.3 Mock 数据示例

```json
{
  "platform": "xhs",
  "external_id": "mock_001",
  "title": "南锣鼓巷深夜食堂 | 老北京炸酱面测评",
  "summary": "藏在胡同里的小店，一碗炸酱面配腊八蒜，才是北京的夜晚。",
  "tags": ["citywalk", "北京", "南锣鼓巷", "美食"],
  "likes": 890,
  "location": "116.3940,39.9420",
  "cover_url": ""
}
```

### 6.4 推荐内容覆盖点

| 序号 | 标题关键词 | 对应地点 | 坐标示例 |
|---|---|---|---|
| 1 | 南锣鼓巷炸酱面 | 南锣鼓巷主街 | 116.3940,39.9420 |
| 2 | 什刹海划船攻略 | 什刹海前海 | 116.3860,39.9420 |
| 3 | 鼓楼最佳拍照位 | 鼓楼东大街 | 116.3930,39.9490 |
| 4 | 烟袋斜街文创店 | 烟袋斜街 | 116.3920,39.9400 |
| 5 | 后海酒吧街漫步 | 后海 | 116.3840,39.9440 |

### 6.5 附近用户 Mock 数据

15 个虚拟用户随机分布在中心点 500m 范围内，字段包含：

```json
{
  "user_id": "user_001",
  "lng": 116.3945,
  "lat": 39.9418,
  "distance": 120
}
```

---

## 七、下一步可选任务

1. **引导流程风格砍为 4 种**：修改 `PetCreateStep` 的 `ALL_STYLES`、`STYLE_LABELS`，同步更新 `types/StyleType`、`MBTI_STYLE_RECOMMENDATIONS`。
2. **主界面接入更换形象入口**：在 `PetDetailPanel` 底部新增"更换形象（300 星尘）"按钮，点击弹出确认弹窗并重置宠物状态。
3. **补齐前端地图页面**：`MapExploreScreen` 接入高德 JS API Web，中心点固定在南锣鼓巷/什刹海/鼓楼，展示 POI 列表和 15 个附近用户。
4. **填充 Mock 数据**：在 `content_collector.py` 中写入 20 条南锣鼓巷/什刹海/鼓楼相关的推荐内容，以及 15 个附近用户。
5. **生成第一批宠物占位图**：用临时占位图或 AI 生成图，先把 24 个路径和命名规范落地到代码里。

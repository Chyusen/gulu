# 咕噜 Gulu — Zeabur 部署指南

## 前置条件

- Zeabur 账号（https://zeabur.com）
- GitHub 仓库已推送：https://github.com/Chyusen/gulu.git

## 部署架构

| 服务 | 类型 | 目录 | 说明 |
|------|------|------|------|
| gulu-web | Static Site | 项目根目录 | React Native Web 静态构建 |
| gulu-api | Docker | backend/ | FastAPI 服务 |

## 第一步：部署前端（gulu-web）

1. 登录 [Zeabur Dashboard](https://zeabur.com/dashboard)
2. 创建新项目（如 `gulu`）
3. 点击 **Add Service** → **Git Service**
4. 选择 GitHub 仓库 `Chyusen/gulu`
5. 服务名称设为 `gulu-web`
6. Zeabur 会自动识别根目录的 `zbpack.json`：
   - 构建命令：`npm ci && npx expo export --platform web --output-dir web-build`
   - 输出目录：`web-build`
7. 在环境变量中添加：
   - `EXPO_PUBLIC_API_BASE_URL`：先留空，等后端部署完成后再填入后端域名（如 `https://gulu-api.zeabur.app/api/v1`）
8. 点击 Deploy

## 第二步：部署后端（gulu-api）

1. 在同一项目中点击 **Add Service** → **Git Service**
2. 再次选择同一个 GitHub 仓库 `Chyusen/gulu`
3. 服务名称设为 `gulu-api`
4. 在 **Settings** → **Root Directory** 中设置为 `backend`
5. Zeabur 会自动识别 `backend/Dockerfile`
6. 在环境变量中添加以下必需变量：

```env
# Supabase（必需）
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_JWT_SECRET=your_jwt_secret

# DeepSeek API（必需，用于 AI 对话）
DEEPSEEK_API_KEY=your_deepseek_key

# 高德地图（可选，用于 Citywalk POI）
AMAP_API_KEY=your_amap_key
AMAP_WEB_KEY=your_amap_web_key

# Redis（可选，用于对话上下文缓存）
REDIS_URL=redis://your_redis_url

# SiliconFlow（可选，用于图像生成）
SILICONFLOW_API_KEY=your_siliconflow_key
```

7. 点击 Deploy

## 第三步：配置前端访问后端

1. 后端部署完成后，在 Zeabur 控制台找到 `gulu-api` 的公共域名
2. 进入 `gulu-web` 服务的环境变量设置
3. 将 `EXPO_PUBLIC_API_BASE_URL` 设置为：
   ```
   https://<your-gulu-api-domain>/api/v1
   ```
4. 重新部署前端服务以应用新环境变量

## 第四步：绑定自定义域名（可选）

1. 在 `gulu-web` 服务的 **Domain** 标签页中添加自定义域名
2. 按提示配置 DNS 记录
3. SSL 证书会自动申请

## 常见问题

### 前端构建失败

- 检查 Node.js 版本是否 >= 18
- 检查 `zbpack.json` 中的 `build_command` 是否正确
- 检查 `EXPO_PUBLIC_API_BASE_URL` 是否已设置（即使为空也不能省略）

### 后端启动失败

- 检查环境变量是否已正确配置
- 检查 `backend/Dockerfile` 是否能本地构建成功：
  ```bash
  cd backend
  docker build -t gulu-api .
  docker run -p 8000:8000 -e PORT=8000 gulu-api
  ```

### 前端无法连接后端

- 确认 `EXPO_PUBLIC_API_BASE_URL` 已重新构建并嵌入
- 确认后端服务已开启公共网络访问
- 确认后端 CORS 允许前端域名（`CORS_ORIGINS` 已设为 `["*"]`）

## 本地验证

```bash
# 前端
npm install
npx expo export --platform web --output-dir web-build

# 后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

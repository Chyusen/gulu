# 咕噜动画资产说明

## 资产清单

### Lottie 动画 - 10个
位于 `animations/lottie/` 目录：

| 文件名 | 描述 | 时长 | 用途 |
|--------|------|------|------|
| `anim_pet_idle.json` | 宠物呼吸/待机 | 2秒循环 | 宠物待机状态 |
| `anim_pet_happy.json` | 宠物开心跳跃 | 1.5秒 | 用户完成行动 |
| `anim_pet_sad.json` | 宠物悲伤 | 2秒 | 需要安慰时 |
| `anim_pet_sleep.json` | 宠物睡觉 | 3秒循环 | 宠物休眠状态 |
| `anim_pet_eat.json` | 宠物吃东西 | 1秒 | 喂食时 |
| `anim_pet_play.json` | 宠物玩耍 | 1.5秒 | 互动玩耍 |
| `anim_pet_evolve.json` | 进化动画 | 3秒 | 宠物进化时 |
| `anim_pet_graying.json` | 灰化过程 | 2.5秒 | 灰化症触发 |
| `anim_pet_recover.json` | 恢复/治愈 | 2秒 | 治疗完成 |
| `anim_loading.json` | 加载动画 | 1.5秒循环 | 页面加载 |

### 粒子特效
粒子特效使用代码实现（Canvas 2D 或 react-native-reanimated），不需要预渲染视频/图片：

| 特效 | 描述 | 实现方式 | 用途 |
|------|------|---------|------|
| 爱心粒子 | 粉色/红色爱心飘出 | Canvas 粒子系统 | 抚摸、拥抱时 |
| 星光粒子 | 金色/白色光点 | Canvas 粒子系统 | 进化、觉醒时 |
| 能量粒子 | 蓝色/绿色光点 | Canvas 粒子系统 | 充能时 |
| 灰化粒子 | 灰色尘埃 | Canvas 粒子系统 | 灰化症时 |
| 治愈粒子 | 绿色光点 + 叶子 | Canvas 粒子系统 | 治疗时 |

## Lottie 动画使用说明

### 在 React Native 中使用
```bash
npm install lottie-react-native
```

```jsx
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./assets/animations/lottie/anim_pet_idle.json')}
  autoPlay
  loop
  style={{ width: 200, height: 200 }}
/>
```

### 在 Web 中使用
```bash
npm install lottie-web
```

```javascript
import lottie from 'lottie-web';

lottie.loadAnimation({
  container: document.getElementById('lottie-container'),
  renderer: 'svg',
  loop: true,
  autoplay: true,
  path: './assets/animations/lottie/anim_pet_idle.json'
});
```

## 视频素材

当前项目以 Lottie 矢量动画为主，视频素材需求可通过以下方式满足：

1. **Lottie 动画** - 已提供10个核心动画，覆盖主要交互场景
2. **粒子特效** - 使用 Canvas/Reanimated 代码实现
3. **如需视频** - 可使用 byted-seedance-video-generate 技能生成：
   - 需要设置 `ARK_API_KEY` 环境变量
   - 支持文生视频、图生视频、多模态参考

### 建议的视频素材（可选）
- 宠物进化全屏特效视频
- 首页动态背景视频
- 品牌宣传视频

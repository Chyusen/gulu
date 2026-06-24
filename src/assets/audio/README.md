# 咕噜音频资产说明

## 资产清单

### 音效 (SFX) - 10个
位于 `audio/sfx/` 目录：
- `sfx_click.wav` - 按钮点击音效
- `sfx_pet.wav` - 抚摸宠物音效
- `sfx_feed.wav` - 喂食音效
- `sfx_evolve.wav` - 进化音效
- `sfx_charge.wav` - 充能音效
- `sfx_graying.wav` - 灰化音效
- `sfx_heal.wav` - 治愈音效
- `sfx_message.wav` - 消息提示音
- `sfx_notification.wav` - 通知音效
- `sfx_error.wav` - 错误提示音

### 背景音乐 (BGM) - 6首
位于 `audio/music/` 目录：
- `bgm_home_theme.wav` - 首页主题
- `bgm_chat_theme.wav` - 对话主题
- `bgm_citywalk_theme.wav` - Citywalk主题
- `bgm_evolve_theme.wav` - 进化主题
- `bgm_graying_theme.wav` - 灰化主题
- `bgm_heal_theme.wav` - 治愈主题

### 语音样本 (Voice) - 35个
位于 `audio/voice/` 目录：
5种音色 × 7种情感 = 35个文件

音色列表：
- `cute_child` - 软萌童声
- `gentle_youth` - 温柔少年音
- `calm_adult` - 沉稳成男音
- `lively_teen` - 活泼青少年音
- `wise_elder` - 睿智长者音

情感列表：
- `happy` - 开心
- `gentle` - 温柔
- `caring` - 关心
- `excited` - 兴奋
- `sleepy` - 困倦
- `surprised` - 惊讶
- `neutral` - 中性

## 重要说明

当前音频文件为**占位文件**（合成音调），用于开发和测试阶段。

### 正式音频获取建议：

1. **语音资产**
   - 使用微软 Azure TTS 或百度语音合成
   - 或使用 AI 声音克隆：ElevenLabs、HeyGen
   - 格式要求：MP3, 44.1kHz, Mono, 320kbps, -16 LUFS

2. **音效资产**
   - 免费来源：Freesound.org、Zapsplat
   - 付费来源：AudioJungle、Epidemic Sound
   - 格式要求：MP3, 44.1kHz, Stereo, 320kbps, -16 LUFS

3. **背景音乐**
   - 免费来源：FreePD、Incompetech、Musopen
   - AI生成：Suno AI、AIVA
   - 格式要求：MP3, 44.1kHz, Stereo, 320kbps, -14 LUFS

### 格式转换
占位文件当前为 WAV 格式，正式资产需要转换为 MP3 格式：
```bash
# 使用 ffmpeg 转换
ffmpeg -i input.wav -codec:a libmp3lame -b:a 320k -ar 44100 output.mp3
```

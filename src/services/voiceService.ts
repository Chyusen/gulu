/**
 * 咕噜 Gulu — 语音服务（TTS）
 * 对应需求文档 九、语音系统
 * - 集成 TTS 引擎
 * - 5 种音色
 * - 播放控制
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import type { VoiceType } from '../types';

/** 音色配置 */
const VOICE_CONFIG: Record<VoiceType, { label: string; pitch: number; rate: number }> = {
  cute_child: { label: '可爱童声', pitch: 1.4, rate: 0.95 },
  gentle_youth: { label: '温柔少年', pitch: 1.1, rate: 1.0 },
  mature_adult: { label: '成熟成人', pitch: 0.9, rate: 1.0 },
  playful_teen: { label: '活泼少年', pitch: 1.2, rate: 1.1 },
  wise_elder: { label: '睿智长者', pitch: 0.8, rate: 0.9 },
};

class VoiceService {
  private currentSound: Audio.Sound | null = null;
  private isEnabled: boolean = true;
  private currentVoice: VoiceType = 'cute_child';
  private queue: string[] = [];
  private isPlaying: boolean = false;

  /** 设置语音开关 */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /** 设置音色 */
  setVoice(voice: VoiceType) {
    this.currentVoice = voice;
  }

  /** 播放文本 */
  async speak(text: string) {
    if (!this.isEnabled) return;

    // 加入队列
    this.queue.push(text);
    if (!this.isPlaying) {
      await this._processQueue();
    }
  }

  /** 停止播放 */
  async stop() {
    this.queue = [];
    this.isPlaying = false;
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (_e) {
        // 忽略
      }
      this.currentSound = null;
    }
    Speech.stop();
  }

  /** 暂停 */
  async pause() {
    if (this.currentSound) {
      await this.currentSound.pauseAsync();
    }
  }

  /** 恢复 */
  async resume() {
    if (this.currentSound) {
      await this.currentSound.playAsync();
    }
  }

  /** 处理播放队列 */
  private async _processQueue() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const text = this.queue.shift()!;

    try {
      // 优先尝试调用后端 TTS API
      const audioUrl = await this._fetchTTS(text);
      if (audioUrl) {
        await this._playAudioUrl(audioUrl);
      } else {
        // 降级：使用系统 TTS (expo-speech)
        await this._fallbackSystemTTS(text);
      }
    } catch (e) {
      console.warn('TTS 播放失败:', e);
    } finally {
      // 继续处理队列
      await this._processQueue();
    }
  }

  /** 调用后端 TTS API 获取音频 URL */
  private async _fetchTTS(_text: string): Promise<string | null> {
    // 实际应调用后端 /api/v1/voice/tts
    // 这里返回 null 以使用降级方案
    return null;
  }

  /** 播放音频 URL */
  private async _playAudioUrl(url: string) {
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    this.currentSound = sound;
    await sound.playAsync();
  }

  /** 降级方案：使用 expo-speech 系统 TTS */
  private async _fallbackSystemTTS(text: string): Promise<void> {
    return new Promise((resolve) => {
      const config = VOICE_CONFIG[this.currentVoice];
      Speech.speak(text, {
        language: 'zh-CN',
        pitch: config.pitch,
        rate: config.rate,
        onDone: () => resolve(),
        onError: () => resolve(),
        onStopped: () => resolve(),
      });
    });
  }

  /** 获取当前音色配置 */
  getVoiceConfig() {
    return VOICE_CONFIG[this.currentVoice];
  }

  /** 获取所有音色列表 */
  getAllVoices(): { type: VoiceType; label: string }[] {
    return (Object.keys(VOICE_CONFIG) as VoiceType[]).map((type) => ({
      type,
      label: VOICE_CONFIG[type].label,
    }));
  }
}

export const voiceService = new VoiceService();

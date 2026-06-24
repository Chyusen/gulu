/**
 * 咕噜 Gulu — AssetManager 资产管理工具类
 * 对应需求文档 1.1.12 / 12.2 AssetManager 实现
 * 所有资产路径通过 AssetManager 统一获取，不硬编码资产路径
 */

import { ImageSourcePropType } from 'react-native';
import { Audio, AVPlaybackSource } from 'expo-av';
import type { PetStage, StyleType, PetState, VoiceType, PetEmotion } from '../types';

/**
 * AssetManager - 统一资产加载与回退
 * 所有资产加载失败必须有占位符回退，并输出 console.warn
 */
export class AssetManager {
  // ========== 图片资产 ==========

  /**
   * 获取宠物形象图片
   * 支持 stage/style/state 参数，有占位图回退
   */
  static getPetImage(
    stage: PetStage,
    style: StyleType,
    state: PetState = 'normal'
  ): ImageSourcePropType {
    try {
      // 使用静态 require 映射，避免动态 require 在 Metro 中的限制
      const key = `${stage}_${style}_${state}`;
      const map = PET_IMAGE_MAP[key];
      if (map) {
        return map;
      }
      console.warn(`Pet image not found: ${stage}/${style}/${state}, using placeholder`);
      return PLACEHOLDER_PET;
    } catch (e) {
      console.warn(`Pet image load error: ${stage}/${style}/${state}`, e);
      return PLACEHOLDER_PET;
    }
  }

  /**
   * 获取图标
   * 支持 name/size 参数，有回退
   */
  static getIcon(name: string, size: 24 | 48 = 24): ImageSourcePropType | null {
    try {
      const key = `${name}_${size}`;
      const icon = ICON_MAP[key];
      if (icon) {
        return icon;
      }
      console.warn(`Icon not found: ${name}_${size}`);
      return null;
    } catch (e) {
      console.warn(`Icon load error: ${name}_${size}`, e);
      return null;
    }
  }

  /**
   * 获取背景图
   * 支持 CSS 渐变回退
   */
  static getBackground(name: string): ImageSourcePropType | null {
    try {
      const bg = BACKGROUND_MAP[name];
      if (bg) {
        return bg;
      }
      console.warn(`Background not found: ${name}, using CSS gradient`);
      return null; // 回退到 CSS 渐变
    } catch (e) {
      console.warn(`Background load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 获取场景图
   * 支持默认场景回退
   */
  static getScene(name: string): ImageSourcePropType {
    try {
      const scene = SCENE_MAP[name];
      if (scene) {
        return scene;
      }
      console.warn(`Scene not found: ${name}, using default`);
      return SCENE_MAP['default_wilderness'];
    } catch (e) {
      console.warn(`Scene load error: ${name}`, e);
      return SCENE_MAP['default_wilderness'];
    }
  }

  /**
   * 获取皮肤图片
   * 支持 stage/name 参数
   */
  static getSkin(stage: PetStage, name: string): ImageSourcePropType | null {
    try {
      const key = `${stage}_${name}`;
      const skin = SKIN_MAP[key];
      if (skin) {
        return skin;
      }
      console.warn(`Skin not found: ${stage}/${name}`);
      return null;
    } catch (e) {
      console.warn(`Skin load error: ${stage}/${name}`, e);
      return null;
    }
  }

  /**
   * 获取食物图标
   * 支持 name 参数
   */
  static getFoodIcon(name: string): ImageSourcePropType | null {
    try {
      const icon = FOOD_MAP[name];
      if (icon) {
        return icon;
      }
      console.warn(`Food icon not found: ${name}`);
      return null;
    } catch (e) {
      console.warn(`Food icon load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 获取配饰商店图标
   * 支持 name 参数
   */
  static getAccessoryIcon(name: string): ImageSourcePropType | null {
    try {
      const icon = ACCESSORY_ICON_MAP[name];
      if (icon) {
        return icon;
      }
      console.warn(`Accessory icon not found: ${name}`);
      return null;
    } catch (e) {
      console.warn(`Accessory icon load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 获取功能按钮图标
   * 支持 name 参数
   */
  static getButtonIcon(name: string): ImageSourcePropType | null {
    try {
      const icon = BUTTON_ICON_MAP[name];
      if (icon) {
        return icon;
      }
      console.warn(`Button icon not found: ${name}`);
      return null;
    } catch (e) {
      console.warn(`Button icon load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 获取礼物图片
   * 支持 name 参数
   */
  static getGift(name: string): ImageSourcePropType | null {
    try {
      const gift = GIFT_MAP[name];
      if (gift) {
        return gift;
      }
      console.warn(`Gift not found: ${name}`);
      return null;
    } catch (e) {
      console.warn(`Gift load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 获取饰品图片
   * 支持 name 参数，用于在宠物身上显示装备的饰品
   */
  static getAccessory(name: string): ImageSourcePropType | null {
    try {
      const accessory = ACCESSORY_MAP[name];
      if (accessory) {
        return accessory;
      }
      console.warn(`Accessory not found: ${name}`);
      return null;
    } catch (e) {
      console.warn(`Accessory load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 检查场景是否存在（不触发默认回退）
   * 用于 Background 组件判断是否使用场景图片
   */
  static hasScene(name: string): boolean {
    return !!SCENE_MAP[name];
  }

  // ========== 音频资产 ==========

  /**
   * 加载音效
   * 支持音效加载，有回退
   */
  static async loadSound(name: string): Promise<Audio.Sound | null> {
    try {
      const source = SFX_MAP[name];
      if (!source) {
        console.warn(`Sound not found: ${name}`);
        return null;
      }
      const { sound } = await Audio.Sound.createAsync(source, { volume: 1.0 });
      return sound;
    } catch (e) {
      console.warn(`Sound load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 加载背景音乐
   * 支持背景音乐加载，有循环控制
   */
  static async loadMusic(name: string, loop: boolean = true): Promise<Audio.Sound | null> {
    try {
      const source = MUSIC_MAP[name];
      if (!source) {
        console.warn(`Music not found: ${name}`);
        return null;
      }
      const { sound } = await Audio.Sound.createAsync(source, {
        isLooping: loop,
        volume: 0.5,
      });
      return sound;
    } catch (e) {
      console.warn(`Music load error: ${name}`, e);
      return null;
    }
  }

  /**
   * 加载语音
   * 支持语音加载（voiceType/emotion）
   */
  static async loadVoice(voiceType: VoiceType, emotion: PetEmotion): Promise<Audio.Sound | null> {
    try {
      const key = `${voiceType}_${emotion}`;
      const source = VOICE_MAP[key];
      if (!source) {
        console.warn(`Voice not found: ${voiceType}/${emotion}`);
        return null;
      }
      const { sound } = await Audio.Sound.createAsync(source);
      return sound;
    } catch (e) {
      console.warn(`Voice load error: ${voiceType}/${emotion}`, e);
      return null;
    }
  }

  // ========== 动画资产 ==========

  /**
   * 获取 Lottie 动画
   * 支持动画加载，有回退
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getLottieAnimation(name: string): any {
    try {
      const anim = LOTTIE_MAP[name];
      if (anim) {
        return anim;
      }
      console.warn(`Animation not found: ${name}`);
      return null;
    } catch (e) {
      console.warn(`Animation load error: ${name}`, e);
      return null;
    }
  }

  // ========== 预加载 ==========

  /**
   * 预加载关键资产
   * 预加载关键动画和音效
   */
  static async preloadCriticalAssets(): Promise<void> {
    const criticalAnimations = ['loading', 'pet_idle', 'pet_happy'];
    const criticalSounds = ['click', 'message', 'feed'];

    // 预加载动画（同步 require 已在模块加载时完成）
    criticalAnimations.forEach((name) => this.getLottieAnimation(name));

    // 预加载音效
    for (const name of criticalSounds) {
      await this.loadSound(name);
    }
  }
}

// ========== 占位图 ==========
// 使用 baby/anime/normal 作为占位图
import placeholderPet from '../assets/images/pets/baby/anime/pet_baby_anime_normal.png';
const PLACEHOLDER_PET: ImageSourcePropType = placeholderPet;

// ========== 食物图标 ==========
import food_basic_biscuit from '../assets/images/ui/food/food_basic_biscuit.png';
import food_star_fruit from '../assets/images/ui/food/food_star_fruit.png';
import food_moon_tea from '../assets/images/ui/food/food_moon_tea.png';
import food_cloud_bread from '../assets/images/ui/food/food_cloud_bread.png';
import food_dream_cake from '../assets/images/ui/food/food_dream_cake.png';
import food_sun_soup from '../assets/images/ui/food/food_sun_soup.png';
import food_rainbow_jelly from '../assets/images/ui/food/food_rainbow_jelly.png';
import food_star_soup from '../assets/images/ui/food/food_star_soup.png';
import food_aurora_candy from '../assets/images/ui/food/food_aurora_candy.png';
import food_soul_pudding from '../assets/images/ui/food/food_soul_pudding.png';

const FOOD_MAP: Record<string, ImageSourcePropType> = {
  'food_basic_biscuit': food_basic_biscuit,
  'food_star_fruit': food_star_fruit,
  'food_moon_tea': food_moon_tea,
  'food_cloud_bread': food_cloud_bread,
  'food_dream_cake': food_dream_cake,
  'food_sun_soup': food_sun_soup,
  'food_rainbow_jelly': food_rainbow_jelly,
  'food_star_soup': food_star_soup,
  'food_aurora_candy': food_aurora_candy,
  'food_soul_pudding': food_soul_pudding,
};

// ========== 配饰商店图标 ==========
import icon_accessory_sakura from '../assets/images/ui/accessories/icons/icon_accessory_sakura.png';
import icon_accessory_umbrella from '../assets/images/ui/accessories/icons/icon_accessory_umbrella.png';
import icon_accessory_music_note from '../assets/images/ui/accessories/icons/icon_accessory_music_note.png';
import icon_accessory_aurora from '../assets/images/ui/accessories/icons/icon_accessory_aurora.png';
import icon_accessory_nebula from '../assets/images/ui/accessories/icons/icon_accessory_nebula.png';

const ACCESSORY_ICON_MAP: Record<string, ImageSourcePropType> = {
  'icon_accessory_sakura': icon_accessory_sakura,
  'icon_accessory_umbrella': icon_accessory_umbrella,
  'icon_accessory_music_note': icon_accessory_music_note,
  'icon_accessory_aurora': icon_accessory_aurora,
  'icon_accessory_nebula': icon_accessory_nebula,
};

// ========== 功能按钮图标 ==========
import btn_feed from '../assets/images/ui/buttons/btn_feed.png';
import btn_friends from '../assets/images/ui/buttons/btn_friends.png';

const BUTTON_ICON_MAP: Record<string, ImageSourcePropType> = {
  'btn_feed': btn_feed,
  'btn_friends': btn_friends,
};

// ========== 宠物图片映射 ==========
// Demo 阶段 4 风格 × 3 阶段，每种提供 normal / graying，dormant 回退到 normal

// baby
import baby_anime_normal from '../assets/images/pets/baby/anime/pet_baby_anime_normal.png';
import baby_anime_graying from '../assets/images/pets/baby/anime/pet_baby_anime_graying.png';
import baby_3d_cartoon_normal from '../assets/images/pets/baby/3d_cartoon/pet_baby_3d_cartoon_normal.png';
import baby_3d_cartoon_graying from '../assets/images/pets/baby/3d_cartoon/pet_baby_3d_cartoon_graying.png';
import baby_pixel_normal from '../assets/images/pets/baby/pixel/pet_baby_pixel_normal.png';
import baby_pixel_graying from '../assets/images/pets/baby/pixel/pet_baby_pixel_graying.png';
import baby_cyberpunk_normal from '../assets/images/pets/baby/cyberpunk/pet_baby_cyberpunk_normal.png';
import baby_cyberpunk_graying from '../assets/images/pets/baby/cyberpunk/pet_baby_cyberpunk_graying.png';

// adult
import adult_anime_normal from '../assets/images/pets/adult/anime/pet_adult_anime_normal.png';
import adult_anime_graying from '../assets/images/pets/adult/anime/pet_adult_anime_graying.png';
import adult_3d_cartoon_normal from '../assets/images/pets/adult/3d_cartoon/pet_adult_3d_cartoon_normal.png';
import adult_3d_cartoon_graying from '../assets/images/pets/adult/3d_cartoon/pet_adult_3d_cartoon_graying.png';
import adult_pixel_normal from '../assets/images/pets/adult/pixel/pet_adult_pixel_normal.png';
import adult_pixel_graying from '../assets/images/pets/adult/pixel/pet_adult_pixel_graying.png';
import adult_cyberpunk_normal from '../assets/images/pets/adult/cyberpunk/pet_adult_cyberpunk_normal.png';
import adult_cyberpunk_graying from '../assets/images/pets/adult/cyberpunk/pet_adult_cyberpunk_graying.png';

// divine
import divine_anime_normal from '../assets/images/pets/divine/anime/pet_divine_anime_normal.png';
import divine_anime_graying from '../assets/images/pets/divine/anime/pet_divine_anime_graying.png';
import divine_3d_cartoon_normal from '../assets/images/pets/divine/3d_cartoon/pet_divine_3d_cartoon_normal.png';
import divine_3d_cartoon_graying from '../assets/images/pets/divine/3d_cartoon/pet_divine_3d_cartoon_graying.png';
import divine_pixel_normal from '../assets/images/pets/divine/pixel/pet_divine_pixel_normal.png';
import divine_pixel_graying from '../assets/images/pets/divine/pixel/pet_divine_pixel_graying.png';
import divine_cyberpunk_normal from '../assets/images/pets/divine/cyberpunk/pet_divine_cyberpunk_normal.png';
import divine_cyberpunk_graying from '../assets/images/pets/divine/cyberpunk/pet_divine_cyberpunk_graying.png';

const PET_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'baby_anime_normal': baby_anime_normal,
  'baby_anime_graying': baby_anime_graying,
  'baby_anime_dormant': baby_anime_normal,
  'baby_anime_happy': baby_anime_normal,
  'baby_anime_sad': baby_anime_graying,
  'baby_realistic_normal': baby_3d_cartoon_normal,
  'baby_realistic_graying': baby_3d_cartoon_graying,
  'baby_realistic_dormant': baby_3d_cartoon_normal,
  'baby_realistic_happy': baby_3d_cartoon_normal,
  'baby_realistic_sad': baby_3d_cartoon_graying,
  'baby_pixel_normal': baby_pixel_normal,
  'baby_pixel_graying': baby_pixel_graying,
  'baby_pixel_dormant': baby_pixel_normal,
  'baby_pixel_happy': baby_pixel_normal,
  'baby_pixel_sad': baby_pixel_graying,
  'baby_scifi_normal': baby_cyberpunk_normal,
  'baby_scifi_graying': baby_cyberpunk_graying,
  'baby_scifi_dormant': baby_cyberpunk_normal,
  'baby_scifi_happy': baby_cyberpunk_normal,
  'baby_scifi_sad': baby_cyberpunk_graying,

  'adult_anime_normal': adult_anime_normal,
  'adult_anime_graying': adult_anime_graying,
  'adult_anime_dormant': adult_anime_normal,
  'adult_anime_happy': adult_anime_normal,
  'adult_anime_sad': adult_anime_graying,
  'adult_realistic_normal': adult_3d_cartoon_normal,
  'adult_realistic_graying': adult_3d_cartoon_graying,
  'adult_realistic_dormant': adult_3d_cartoon_normal,
  'adult_realistic_happy': adult_3d_cartoon_normal,
  'adult_realistic_sad': adult_3d_cartoon_graying,
  'adult_pixel_normal': adult_pixel_normal,
  'adult_pixel_graying': adult_pixel_graying,
  'adult_pixel_dormant': adult_pixel_normal,
  'adult_pixel_happy': adult_pixel_normal,
  'adult_pixel_sad': adult_pixel_graying,
  'adult_scifi_normal': adult_cyberpunk_normal,
  'adult_scifi_graying': adult_cyberpunk_graying,
  'adult_scifi_dormant': adult_cyberpunk_normal,
  'adult_scifi_happy': adult_cyberpunk_normal,
  'adult_scifi_sad': adult_cyberpunk_graying,

  'divine_anime_normal': divine_anime_normal,
  'divine_anime_graying': divine_anime_graying,
  'divine_anime_dormant': divine_anime_normal,
  'divine_anime_happy': divine_anime_normal,
  'divine_anime_sad': divine_anime_graying,
  'divine_realistic_normal': divine_3d_cartoon_normal,
  'divine_realistic_graying': divine_3d_cartoon_graying,
  'divine_realistic_dormant': divine_3d_cartoon_normal,
  'divine_realistic_happy': divine_3d_cartoon_normal,
  'divine_realistic_sad': divine_3d_cartoon_graying,
  'divine_pixel_normal': divine_pixel_normal,
  'divine_pixel_graying': divine_pixel_graying,
  'divine_pixel_dormant': divine_pixel_normal,
  'divine_pixel_happy': divine_pixel_normal,
  'divine_pixel_sad': divine_pixel_graying,
  'divine_scifi_normal': divine_cyberpunk_normal,
  'divine_scifi_graying': divine_cyberpunk_graying,
  'divine_scifi_dormant': divine_cyberpunk_normal,
  'divine_scifi_happy': divine_cyberpunk_normal,
  'divine_scifi_sad': divine_cyberpunk_graying,
};

// ========== 图标映射 ==========
import icon_home_24 from '../assets/images/ui/icons/icon_home_24.svg';
import icon_home_48 from '../assets/images/ui/icons/icon_home_48.svg';
import icon_chat_24 from '../assets/images/ui/icons/icon_chat_24.svg';
import icon_chat_48 from '../assets/images/ui/icons/icon_chat_48.svg';
import icon_citywalk_24 from '../assets/images/ui/icons/icon_citywalk_24.svg';
import icon_citywalk_48 from '../assets/images/ui/icons/icon_citywalk_48.svg';
import icon_profile_24 from '../assets/images/ui/icons/icon_profile_24.svg';
import icon_profile_48 from '../assets/images/ui/icons/icon_profile_48.svg';
import icon_energy_24 from '../assets/images/ui/icons/icon_energy_24.svg';
import icon_energy_48 from '../assets/images/ui/icons/icon_energy_48.svg';
import icon_evolution_24 from '../assets/images/ui/icons/icon_evolution_24.svg';
import icon_evolution_48 from '../assets/images/ui/icons/icon_evolution_48.svg';
import icon_graying_24 from '../assets/images/ui/icons/icon_graying_24.svg';
import icon_graying_48 from '../assets/images/ui/icons/icon_graying_48.svg';
import icon_settings_24 from '../assets/images/ui/icons/icon_settings_24.svg';
import icon_settings_48 from '../assets/images/ui/icons/icon_settings_48.svg';
import icon_notification_24 from '../assets/images/ui/icons/icon_notification_24.svg';
import icon_notification_48 from '../assets/images/ui/icons/icon_notification_48.svg';
import icon_back_24 from '../assets/images/ui/icons/icon_back_24.svg';
import icon_back_48 from '../assets/images/ui/icons/icon_back_48.svg';
import icon_close_24 from '../assets/images/ui/icons/icon_close_24.svg';
import icon_close_48 from '../assets/images/ui/icons/icon_close_48.svg';
import icon_more_24 from '../assets/images/ui/icons/icon_more_24.svg';
import icon_more_48 from '../assets/images/ui/icons/icon_more_48.svg';

const ICON_MAP: Record<string, ImageSourcePropType> = {
  'home_24': icon_home_24,
  'home_48': icon_home_48,
  'chat_24': icon_chat_24,
  'chat_48': icon_chat_48,
  'citywalk_24': icon_citywalk_24,
  'citywalk_48': icon_citywalk_48,
  'profile_24': icon_profile_24,
  'profile_48': icon_profile_48,
  'energy_24': icon_energy_24,
  'energy_48': icon_energy_48,
  'evolution_24': icon_evolution_24,
  'evolution_48': icon_evolution_48,
  'graying_24': icon_graying_24,
  'graying_48': icon_graying_48,
  'settings_24': icon_settings_24,
  'settings_48': icon_settings_48,
  'notification_24': icon_notification_24,
  'notification_48': icon_notification_48,
  'back_24': icon_back_24,
  'back_48': icon_back_48,
  'close_24': icon_close_24,
  'close_48': icon_close_48,
  'more_24': icon_more_24,
  'more_48': icon_more_48,
};

// ========== 背景图映射 ==========
import bg_home from '../assets/images/ui/backgrounds/bg_home_gradient.webp';
import bg_chat from '../assets/images/ui/backgrounds/bg_chat_gradient.webp';
import bg_profile from '../assets/images/ui/backgrounds/bg_profile_gradient.webp';
import bg_loading from '../assets/images/ui/backgrounds/bg_loading.webp';

const BACKGROUND_MAP: Record<string, ImageSourcePropType> = {
  'home': bg_home,
  'chat': bg_chat,
  'profile': bg_profile,
  'loading': bg_loading,
};

// ========== 场景图映射 ==========
import scene_default_wilderness from '../assets/images/scenes/scene_default_wilderness.webp';
import scene_cloud_nest from '../assets/images/scenes/scene_cloud_nest.webp';
import scene_cyberpunk_ruins from '../assets/images/scenes/scene_cyberpunk_ruins.webp';
import scene_deep_sea_palace from '../assets/images/scenes/scene_deep_sea_palace.webp';
import scene_magic_forest from '../assets/images/scenes/scene_magic_forest.webp';
import scene_sakura_courtyard from '../assets/images/scenes/scene_sakura_courtyard.webp';

const SCENE_MAP: Record<string, ImageSourcePropType> = {
  'default_wilderness': scene_default_wilderness,
  'cloud_nest': scene_cloud_nest,
  'cyberpunk_ruins': scene_cyberpunk_ruins,
  'deep_sea_palace': scene_deep_sea_palace,
  'magic_forest': scene_magic_forest,
  'sakura_courtyard': scene_sakura_courtyard,
};

// ========== 皮肤映射 ==========
import skin_baby_aurora from '../assets/images/skins/baby/skin_baby_aurora.png';
import skin_baby_nebula from '../assets/images/skins/baby/skin_baby_nebula.png';
import skin_adult_aurora from '../assets/images/skins/adult/skin_adult_aurora.png';
import skin_divine_aurora from '../assets/images/skins/divine/skin_divine_aurora.png';

const SKIN_MAP: Record<string, ImageSourcePropType> = {
  'baby_aurora': skin_baby_aurora,
  'baby_nebula': skin_baby_nebula,
  'adult_aurora': skin_adult_aurora,
  'divine_aurora': skin_divine_aurora,
};

// ========== 礼物映射 ==========
import gift_clover from '../assets/images/gifts/gift_clover.png';
import gift_meteor from '../assets/images/gifts/gift_meteor.png';
import gift_rainbow from '../assets/images/gifts/gift_rainbow.png';
import gift_star_bottle from '../assets/images/gifts/gift_star_bottle.png';
import gift_sunflower from '../assets/images/gifts/gift_sunflower.png';

const GIFT_MAP: Record<string, ImageSourcePropType> = {
  'clover': gift_clover,
  'meteor': gift_meteor,
  'rainbow': gift_rainbow,
  'star_bottle': gift_star_bottle,
  'sunflower': gift_sunflower,
};

// ========== 饰品映射 ==========
import accessory_sakura from '../assets/images/ui/accessories/wear/accessory_sakura.png';
import accessory_umbrella from '../assets/images/ui/accessories/wear/accessory_umbrella.png';
import accessory_music_note from '../assets/images/ui/accessories/wear/accessory_music_note.png';
import accessory_aurora from '../assets/images/ui/accessories/wear/accessory_aurora.png';
import accessory_nebula from '../assets/images/ui/accessories/wear/accessory_nebula.png';

const ACCESSORY_MAP: Record<string, ImageSourcePropType> = {
  'sakura': accessory_sakura,
  'umbrella': accessory_umbrella,
  'music_note': accessory_music_note,
  'aurora': accessory_aurora,
  'nebula': accessory_nebula,
};

// ========== 音效映射 ==========
import sfx_click from '../assets/audio/sfx/sfx_click.wav';
import sfx_charge from '../assets/audio/sfx/sfx_charge.wav';
import sfx_error from '../assets/audio/sfx/sfx_error.wav';
import sfx_evolve from '../assets/audio/sfx/sfx_evolve.wav';
import sfx_feed from '../assets/audio/sfx/sfx_feed.wav';
import sfx_graying from '../assets/audio/sfx/sfx_graying.wav';
import sfx_heal from '../assets/audio/sfx/sfx_heal.wav';
import sfx_message from '../assets/audio/sfx/sfx_message.wav';
import sfx_notification from '../assets/audio/sfx/sfx_notification.wav';
import sfx_pet from '../assets/audio/sfx/sfx_pet.wav';

const SFX_MAP: Record<string, AVPlaybackSource> = {
  'click': sfx_click,
  'charge': sfx_charge,
  'error': sfx_error,
  'evolve': sfx_evolve,
  'feed': sfx_feed,
  'graying': sfx_graying,
  'heal': sfx_heal,
  'message': sfx_message,
  'notification': sfx_notification,
  'pet': sfx_pet,
};

// ========== 背景音乐映射 ==========
import bgm_home_theme from '../assets/audio/music/bgm_home_theme.wav';
import bgm_chat_theme from '../assets/audio/music/bgm_chat_theme.wav';
import bgm_citywalk_theme from '../assets/audio/music/bgm_citywalk_theme.wav';
import bgm_evolve_theme from '../assets/audio/music/bgm_evolve_theme.wav';
import bgm_graying_theme from '../assets/audio/music/bgm_graying_theme.wav';
import bgm_heal_theme from '../assets/audio/music/bgm_heal_theme.wav';

const MUSIC_MAP: Record<string, AVPlaybackSource> = {
  'home_theme': bgm_home_theme,
  'chat_theme': bgm_chat_theme,
  'citywalk_theme': bgm_citywalk_theme,
  'evolve_theme': bgm_evolve_theme,
  'graying_theme': bgm_graying_theme,
  'heal_theme': bgm_heal_theme,
};

// ========== 语音映射 ==========
import voice_cute_child_happy from '../assets/audio/voice/voice_cute_child_happy.wav';
import voice_cute_child_neutral from '../assets/audio/voice/voice_cute_child_neutral.wav';
import voice_cute_child_sad from '../assets/audio/voice/voice_cute_child_sleepy.wav';
import voice_cute_child_graying from '../assets/audio/voice/voice_cute_child_caring.wav';
import voice_cute_child_excited from '../assets/audio/voice/voice_cute_child_excited.wav';
import voice_cute_child_normal from '../assets/audio/voice/voice_cute_child_gentle.wav';
import voice_cute_child_dormant from '../assets/audio/voice/voice_cute_child_sleepy.wav';

import voice_gentle_youth_happy from '../assets/audio/voice/voice_gentle_youth_happy.wav';
import voice_gentle_youth_neutral from '../assets/audio/voice/voice_gentle_youth_neutral.wav';
import voice_gentle_youth_sad from '../assets/audio/voice/voice_gentle_youth_sleepy.wav';
import voice_gentle_youth_graying from '../assets/audio/voice/voice_gentle_youth_caring.wav';
import voice_gentle_youth_excited from '../assets/audio/voice/voice_gentle_youth_excited.wav';
import voice_gentle_youth_normal from '../assets/audio/voice/voice_gentle_youth_gentle.wav';
import voice_gentle_youth_dormant from '../assets/audio/voice/voice_gentle_youth_sleepy.wav';

import voice_mature_adult_happy from '../assets/audio/voice/voice_calm_adult_happy.wav';
import voice_mature_adult_neutral from '../assets/audio/voice/voice_calm_adult_neutral.wav';
import voice_mature_adult_sad from '../assets/audio/voice/voice_calm_adult_sleepy.wav';
import voice_mature_adult_graying from '../assets/audio/voice/voice_calm_adult_caring.wav';
import voice_mature_adult_excited from '../assets/audio/voice/voice_calm_adult_excited.wav';
import voice_mature_adult_normal from '../assets/audio/voice/voice_calm_adult_gentle.wav';
import voice_mature_adult_dormant from '../assets/audio/voice/voice_calm_adult_sleepy.wav';

import voice_playful_teen_happy from '../assets/audio/voice/voice_lively_teen_happy.wav';
import voice_playful_teen_neutral from '../assets/audio/voice/voice_lively_teen_neutral.wav';
import voice_playful_teen_sad from '../assets/audio/voice/voice_lively_teen_sleepy.wav';
import voice_playful_teen_graying from '../assets/audio/voice/voice_lively_teen_caring.wav';
import voice_playful_teen_excited from '../assets/audio/voice/voice_lively_teen_excited.wav';
import voice_playful_teen_normal from '../assets/audio/voice/voice_lively_teen_gentle.wav';
import voice_playful_teen_dormant from '../assets/audio/voice/voice_lively_teen_sleepy.wav';

import voice_wise_elder_happy from '../assets/audio/voice/voice_wise_elder_happy.wav';
import voice_wise_elder_neutral from '../assets/audio/voice/voice_wise_elder_neutral.wav';
import voice_wise_elder_sad from '../assets/audio/voice/voice_wise_elder_sleepy.wav';
import voice_wise_elder_graying from '../assets/audio/voice/voice_wise_elder_caring.wav';
import voice_wise_elder_excited from '../assets/audio/voice/voice_wise_elder_excited.wav';
import voice_wise_elder_normal from '../assets/audio/voice/voice_wise_elder_gentle.wav';
import voice_wise_elder_dormant from '../assets/audio/voice/voice_wise_elder_sleepy.wav';

const VOICE_MAP: Record<string, AVPlaybackSource> = {
  'cute_child_happy': voice_cute_child_happy,
  'cute_child_neutral': voice_cute_child_neutral,
  'cute_child_sad': voice_cute_child_sad,
  'cute_child_graying': voice_cute_child_graying,
  'cute_child_excited': voice_cute_child_excited,
  'cute_child_normal': voice_cute_child_normal,
  'cute_child_dormant': voice_cute_child_dormant,
  'gentle_youth_happy': voice_gentle_youth_happy,
  'gentle_youth_neutral': voice_gentle_youth_neutral,
  'gentle_youth_sad': voice_gentle_youth_sad,
  'gentle_youth_graying': voice_gentle_youth_graying,
  'gentle_youth_excited': voice_gentle_youth_excited,
  'gentle_youth_normal': voice_gentle_youth_normal,
  'gentle_youth_dormant': voice_gentle_youth_dormant,
  'mature_adult_happy': voice_mature_adult_happy,
  'mature_adult_neutral': voice_mature_adult_neutral,
  'mature_adult_sad': voice_mature_adult_sad,
  'mature_adult_graying': voice_mature_adult_graying,
  'mature_adult_excited': voice_mature_adult_excited,
  'mature_adult_normal': voice_mature_adult_normal,
  'mature_adult_dormant': voice_mature_adult_dormant,
  'playful_teen_happy': voice_playful_teen_happy,
  'playful_teen_neutral': voice_playful_teen_neutral,
  'playful_teen_sad': voice_playful_teen_sad,
  'playful_teen_graying': voice_playful_teen_graying,
  'playful_teen_excited': voice_playful_teen_excited,
  'playful_teen_normal': voice_playful_teen_normal,
  'playful_teen_dormant': voice_playful_teen_dormant,
  'wise_elder_happy': voice_wise_elder_happy,
  'wise_elder_neutral': voice_wise_elder_neutral,
  'wise_elder_sad': voice_wise_elder_sad,
  'wise_elder_graying': voice_wise_elder_graying,
  'wise_elder_excited': voice_wise_elder_excited,
  'wise_elder_normal': voice_wise_elder_normal,
  'wise_elder_dormant': voice_wise_elder_dormant,
};

// ========== Lottie 动画映射 ==========
import anim_loading from '../assets/animations/lottie/anim_loading.json';
import anim_pet_eat from '../assets/animations/lottie/anim_pet_eat.json';
import anim_pet_evolve from '../assets/animations/lottie/anim_pet_evolve.json';
import anim_pet_graying from '../assets/animations/lottie/anim_pet_graying.json';
import anim_pet_happy from '../assets/animations/lottie/anim_pet_happy.json';
import anim_pet_idle from '../assets/animations/lottie/anim_pet_idle.json';
import anim_pet_play from '../assets/animations/lottie/anim_pet_play.json';
import anim_pet_recover from '../assets/animations/lottie/anim_pet_recover.json';
import anim_pet_sad from '../assets/animations/lottie/anim_pet_sad.json';
import anim_pet_sleep from '../assets/animations/lottie/anim_pet_sleep.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOTTIE_MAP: Record<string, any> = {
  'loading': anim_loading,
  'pet_eat': anim_pet_eat,
  'pet_evolve': anim_pet_evolve,
  'pet_graying': anim_pet_graying,
  'pet_happy': anim_pet_happy,
  'pet_idle': anim_pet_idle,
  'pet_play': anim_pet_play,
  'pet_recover': anim_pet_recover,
  'pet_sad': anim_pet_sad,
  'pet_sleep': anim_pet_sleep,
};

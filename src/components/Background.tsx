import React from 'react';
import { ImageBackground, View, StyleSheet, Platform } from 'react-native';
import { AssetManager } from '../utils/AssetManager';

interface BackgroundProps {
  name: string;
  children: React.ReactNode;
}

// ========== 紫色渐变场景配置 ==========

interface GradientSceneConfig {
  /** 渐变起始色（顶部） */
  start: string;
  /** 渐变结束色（底部） */
  end: string;
  /** 叠加纹理类型：stars 星点 / halo 光晕 */
  texture: 'stars' | 'halo' | null;
}

/**
 * 紫色渐变背景场景配置
 * - home:    深紫色渐变 #1A0F2E → #2D1B4E，叠加星点纹理，与引导流程色系一致
 * - profile: 稍亮的紫色渐变 #2A1A4A → #3D2B5E，叠加光晕纹理
 *
 * 注意：onboarding（loading）场景保持原有图片背景，不在此配置中
 */
const GRADIENT_SCENES: Record<string, GradientSceneConfig> = {
  // home 默认使用 BACKGROUND_MAP 中的 bg_home_gradient.webp 图片背景
  profile: { start: '#3A2560', end: '#553590', texture: 'halo' },
};

// Native 端用多层 View 模拟渐变的层数（越多越平滑，但开销越大）
const GRADIENT_LAYERS = 8;

// ========== 颜色工具 ==========

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/** 在两个十六进制颜色之间线性插值，t ∈ [0, 1] */
function interpolateColor(start: string, end: string, t: number): string {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// ========== Background 组件 ==========

export function Background({ name, children }: BackgroundProps) {
  const gradientConfig = GRADIENT_SCENES[name];

  // 紫色渐变场景：渲染渐变 + 纹理背景
  if (gradientConfig) {
    return (
      <GradientBackground config={gradientConfig}>{children}</GradientBackground>
    );
  }

  // 场景图片背景：装备场景时切换主界面背景
  if (AssetManager.hasScene(name)) {
    const sceneSource = AssetManager.getScene(name);
    return (
      <ImageBackground
        source={sceneSource}
        style={styles.container}
        resizeMode="cover"
        imageStyle={styles.image}
      >
        {children}
      </ImageBackground>
    );
  }

  // 其他场景（如 onboarding/loading）：保持原有图片背景逻辑
  const source = AssetManager.getBackground(name);

  if (!source) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <ImageBackground
      source={source}
      style={styles.container}
      resizeMode="cover"
      imageStyle={styles.image}
    >
      {children}
    </ImageBackground>
  );
}

// ========== 渐变背景子组件 ==========

interface GradientBackgroundProps {
  config: GradientSceneConfig;
  children: React.ReactNode;
}

function GradientBackground({ config, children }: GradientBackgroundProps) {
  const { start, end, texture } = config;
  const isWeb = Platform.OS === 'web';

  // Web 端 CSS 渐变字符串
  const cssGradient = `linear-gradient(to bottom, ${start}, ${end})`;

  return (
    <View style={[styles.container, { backgroundColor: start }]}>
      {/* === 渐变层 === */}
      {isWeb ? (
        // Web：CSS linear-gradient，平滑且高性能
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundImage: cssGradient } as never]}
        />
      ) : (
        // Native：用多层 View 叠加插值色模拟渐变
        Array.from({ length: GRADIENT_LAYERS }).map((_, i) => {
          const t = i / (GRADIENT_LAYERS - 1);
          const color = interpolateColor(start, end, t);
          const bandHeight = 100 / GRADIENT_LAYERS;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${i * bandHeight}%`,
                height: `${bandHeight + 0.5}%`, // 微重叠避免接缝
                backgroundColor: color,
              }}
            />
          );
        })
      )}

      {/* === 纹理层：使用 CSS 渐变光晕/暗角替代 PNG，避免脏污感 === */}
      {isWeb ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                texture === 'stars'
                  ? `radial-gradient(circle at 20% 30%, rgba(120,90,180,0.18) 0%, transparent 35%), radial-gradient(circle at 80% 70%, rgba(80,60,140,0.14) 0%, transparent 30%), radial-gradient(circle at 50% 90%, rgba(30,15,50,0.45) 0%, transparent 50%)`
                  : `radial-gradient(circle at 50% 20%, rgba(120,90,180,0.16) 0%, transparent 35%), radial-gradient(circle at 30% 80%, rgba(80,60,140,0.12) 0%, transparent 30%), radial-gradient(circle at 50% 50%, rgba(30,15,50,0.25) 0%, transparent 60%)`,
            } as never,
          ]}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                texture === 'stars'
                  ? 'rgba(20,10,35,0.12)'
                  : 'rgba(20,10,35,0.08)',
            },
          ]}
        />
      )}

      {/* === 内容层 === */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
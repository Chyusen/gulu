/**
 * 咕噜 Gulu — 静态资源类型声明
 * 让 TypeScript 识别图片/音频等静态资源导入
 */

declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.jpg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.jpeg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.webp' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.svg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.wav' {
  const value: import('expo-av').AVPlaybackSource;
  export default value;
}

declare module '*.mp3' {
  const value: import('expo-av').AVPlaybackSource;
  export default value;
}

declare module '*.json' {
  const value: unknown;
  export default value;
}

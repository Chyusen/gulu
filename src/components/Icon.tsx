import React, { useEffect, useState } from 'react';
import { Image, Platform, View, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';
import { AssetManager } from '../utils/AssetManager';

interface IconProps {
  name: string;
  size?: 24 | 48;
  color?: string;
}

export function Icon({ name, size = 24, color }: IconProps) {
  const source = AssetManager.getIcon(name, size);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      setUri(null);
      return;
    }

    const resolvedSource = source;
    let cancelled = false;
    async function resolve() {
      try {
        if (typeof resolvedSource === 'string') {
          if (!cancelled) setUri(resolvedSource);
          return;
        }

        if (typeof resolvedSource === 'number') {
          const asset = Asset.fromModule(resolvedSource);
          if (!asset.downloaded) {
            await asset.downloadAsync();
          }
          if (!cancelled) setUri(asset.uri);
          return;
        }

        const fallback = Image.resolveAssetSource(resolvedSource);
        if (!cancelled) setUri(fallback?.uri ?? null);
      } catch {
        if (!cancelled) setUri(null);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (!uri) {
    return <View style={[styles.fallback, { width: size, height: size }]} />;
  }

  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, tintColor: color }}
        resizeMode="contain"
      />
    );
  }

  return (
    <SvgUri
      uri={uri}
      width={size}
      height={size}
      fill={color}
      style={styles.icon}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'transparent',
  },
  icon: {
    backgroundColor: 'transparent',
  },
});

/**
 * 咕噜 Gulu — Web 端高德地图视图
 * 仅在 Web 平台使用，动态加载高德 JS API 2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';

interface MapViewProps {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: Array<{ lng: number; lat: number; title?: string }>;
  circles?: Array<{ lng: number; lat: number; radius: number }>;
}

const AMAP_WEB_KEY = process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
const AMAP_SECRET = process.env.EXPO_PUBLIC_AMAP_JSAPI_SECRET;

interface WindowWithAMap extends Window {
  AMap?: typeof AMap;
  _AMapSecurityConfig?: { securityJsCode: string };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AMap: {
  Map: new (container: HTMLDivElement, options: Record<string, unknown>) => AMapInstance;
  Marker: new (options: Record<string, unknown>) => AMapEntity;
  Circle: new (options: Record<string, unknown>) => AMapEntity;
};

interface AMapInstance {
  add: (target: AMapEntity) => void;
  clearMap: () => void;
  destroy: () => void;
}

interface AMapEntity {
  // 高德实体对象占位
}

function loadAMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('not in browser'));
      return;
    }
    const win = window as WindowWithAMap;
    if (win.AMap) {
      resolve();
      return;
    }

    // 配置安全密钥
    if (AMAP_SECRET) {
      win._AMapSecurityConfig = {
        securityJsCode: AMAP_SECRET,
      };
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_WEB_KEY}`;
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    script.onload = () => {
      // 等待 AMap 全局对象可用
      const check = () => {
        if (win.AMap) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    };
    document.head.appendChild(script);
  });
}

const mapDivStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 12,
};

export function MapView({ center, zoom = 15, markers = [], circles = [] }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 用于在地图实例创建/重建后触发标记更新
  const [mapVersion, setMapVersion] = useState(0);

  // 第一个 effect：仅依赖 center 和 zoom，负责创建/重建地图实例
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        await loadAMapScript();
        if (!isMounted || !containerRef.current) return;

        const win = window as WindowWithAMap;
        const AMapLib = win.AMap;
        if (!AMapLib) {
          setError('高德地图对象未加载');
          setLoading(false);
          return;
        }

        mapRef.current = new AMapLib.Map(containerRef.current, {
          zoom,
          center,
          viewMode: '2D',
        });

        setLoading(false);
        // 通知标记更新 effect：地图已就绪
        setMapVersion((v) => v + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : '地图加载失败');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  // 第二个 effect：依赖 markers 和 circles（用 JSON.stringify 做依赖），负责更新标记和范围圈
  const markersJson = JSON.stringify(markers);
  const circlesJson = JSON.stringify(circles);

  useEffect(() => {
    if (mapVersion === 0) return;

    const map = mapRef.current;
    if (!map) return;

    const win = window as WindowWithAMap;
    const AMapLib = win.AMap;
    if (!AMapLib) return;

    // 清除旧标记
    map.clearMap();

    const parsedMarkers = JSON.parse(markersJson) as Array<{ lng: number; lat: number; title?: string }>;
    const parsedCircles = JSON.parse(circlesJson) as Array<{ lng: number; lat: number; radius: number }>;

    // 添加标记
    parsedMarkers.forEach((m) => {
      const marker = new AMapLib.Marker({
        position: [m.lng, m.lat],
        title: m.title,
      });
      map.add(marker);
    });

    // 添加范围圈
    parsedCircles.forEach((c) => {
      const circle = new AMapLib.Circle({
        center: [c.lng, c.lat],
        radius: c.radius,
        fillColor: `${theme.colors.primary}30`,
        strokeColor: theme.colors.primary,
        strokeWeight: 1,
      });
      map.add(circle);
    });
  }, [markersJson, circlesJson, mapVersion]);

  return (
    <View style={styles.container}>
      <div ref={containerRef} style={mapDivStyle} />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.overlayText}>地图加载中...</Text>
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.errorHint}>请检查高德 Key 配置</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.background}CC`,
  },
  overlayText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.energyLow,
    fontWeight: '600',
  },
  errorHint: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});

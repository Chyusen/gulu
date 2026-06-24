/**
 * 咕噜 Gulu — App 入口
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AssetManager } from './src/utils/AssetManager';
import { applyOfflineProgression } from './src/utils/growthEngine';
import { usePetStore } from './src/stores/petStore';
import { useTaskStore } from './src/stores/taskStore';
import { useExploreStore } from './src/stores/exploreStore';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default function App() {
  const pet = usePetStore((s) => s.pet);
  const hasAppliedOffline = useRef(false);
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (renderCount.current <= 5) {
    console.log('App render', renderCount.current, { petExists: !!pet });
  }

  useEffect(() => {
    // 预加载关键资产
    AssetManager.preloadCriticalAssets().catch((e) => {
      console.warn('Preload assets failed:', e);
    });
  }, []);

  // 应用离线养成逻辑（用户重新打开 App 时，pet 异步恢复后也触发）
  useEffect(() => {
    if (pet && !hasAppliedOffline.current) {
      hasAppliedOffline.current = true;

      // 初始化新版本宠物数值（兼容旧数据）
      usePetStore.getState().initializePetStats();

      // 应用亲密度衰减
      usePetStore.getState().applyIntimacyDecay();

      // 检查任务重置
      useTaskStore.getState().checkAndReset(pet.stageNumber);

      // 检查自主探索是否已完成
      useExploreStore.getState().checkAutoExploreComplete();

      const result = applyOfflineProgression();
      if (result.energyLost > 0) {
        console.log(`能量衰减: -${result.energyLost}`);
      }
      if (result.grayingTriggered) {
        console.warn('咕噜触发了灰化症');
      }
      if (result.evolved) {
        console.log(`咕噜进化到: ${result.newStage}`);
      }
    }
  }, [pet]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

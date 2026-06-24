/**
 * 咕噜 Gulu — 根导航
 * 根据登录与画像状态切换到不同流程
 * 引导流程统一使用 OnboardingFlow，主界面使用 Main
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainScreen } from '../screens/MainScreen';
import { OnboardingFlowScreen } from '../screens/OnboardingFlowScreen';
import { ZodiacScreen } from '../screens/ZodiacScreen';
import { ProfileResultScreen } from '../screens/ProfileResultScreen';
import { PetCreateScreen } from '../screens/PetCreateScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { FriendListScreen } from '../screens/FriendListScreen';
import { DailyTaskScreen } from '../screens/DailyTaskScreen';
import { WeeklyTaskScreen } from '../screens/WeeklyTaskScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { CompanionActivityScreen } from '../screens/CompanionActivityScreen';
import { AutoExploreScreen } from '../screens/AutoExploreScreen';
import { GuluWhisperScreen } from '../screens/GuluWhisperScreen';
import { CitywalkScreen } from '../screens/CitywalkScreen';
import { MapExploreScreen } from '../screens/MapExploreScreen';

export type RootStackParamList = {
  OnboardingFlow: undefined;
  Zodiac: undefined;
  ProfileResult: undefined;
  PetCreate: undefined;
  Shop: undefined;
  Inventory: undefined;
  FriendList: undefined;
  DailyTask: undefined;
  WeeklyTask: undefined;
  Explore: undefined;
  CompanionActivity: { mode: 'indoor' | 'walk' | 'sport' };
  AutoExplore: undefined;
  GuluWhisper: undefined;
  Citywalk: undefined;
  MapExplore: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  // 决定初始路由，只在首次计算，避免后续状态恢复导致 Navigator 重新初始化
  // Demo 模式：每次启动都进入引导流程，方便测试体验
  const initialRouteRef = React.useRef<keyof RootStackParamList | null>(null);
  if (initialRouteRef.current === null) {
    initialRouteRef.current = 'OnboardingFlow';
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteRef.current}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="OnboardingFlow" component={OnboardingFlowScreen} />
        <Stack.Screen name="Zodiac" component={ZodiacScreen} />
        <Stack.Screen name="ProfileResult" component={ProfileResultScreen} />
        <Stack.Screen name="PetCreate" component={PetCreateScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} options={{ headerShown: true, title: '商店' }} />
        <Stack.Screen name="Inventory" component={InventoryScreen} options={{ headerShown: true, title: '背包' }} />
        <Stack.Screen name="FriendList" component={FriendListScreen} options={{ headerShown: true, title: '好友' }} />
        <Stack.Screen name="DailyTask" component={DailyTaskScreen} options={{ headerShown: true, title: '每日任务' }} />
        <Stack.Screen name="WeeklyTask" component={WeeklyTaskScreen} options={{ headerShown: true, title: '每周任务' }} />
        <Stack.Screen name="Explore" component={ExploreScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CompanionActivity" component={CompanionActivityScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AutoExplore" component={AutoExploreScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GuluWhisper" component={GuluWhisperScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Citywalk" component={CitywalkScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MapExplore" component={MapExploreScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={MainScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

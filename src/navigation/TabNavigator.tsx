/**
 * 咕噜 Gulu — 底部 Tab 导航
 * 对应需求文档 1.1.4 配置 React Navigation
 * @deprecated 已被 MainScreen（宠物中心式导航）取代，不再通过 RootNavigator 路由。
 *             保留以供参考，新功能请在 MainScreen 中实现。
 */

import React from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ImmersiveChatScreen } from '../screens/ImmersiveChatScreen';
import { CitywalkScreen } from '../screens/CitywalkScreen';
import { SocialScreen } from '../screens/SocialScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { theme } from '../constants/theme';

export type RootTabParamList = {
  Home: undefined;
  Chat: undefined;
  Citywalk: undefined;
  Social: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/** @deprecated 已被 MainScreen 取代 */
export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSize.caption,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/images/ui/icons/nav/home_nav.png')}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ImmersiveChatScreen}
        options={{
          title: '对话',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/images/ui/icons/nav/chat_nav.png')}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Citywalk"
        component={CitywalkScreen}
        options={{
          title: 'Citywalk',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/images/ui/icons/nav/explore_nav.png')}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          title: '社交',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/images/ui/icons/nav/profile_nav.png')}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

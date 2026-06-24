/**
 * 咕噜 Gulu — 全屏弹窗容器
 * 使用 absolute 定位覆盖主界面，避免 Modal 在 Web 端的触摸事件问题
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface FullScreenModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function FullScreenModal({ visible, onClose, title, children }: FullScreenModalProps) {
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(onClose);
  }, [slideAnim, onClose]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 400],
              }),
            },
          ],
        },
      ]}
    >
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleClose} activeOpacity={0.7}>
          <Image source={require('../assets/images/ui/icons/system/back_icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 内容 */}
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    zIndex: 9999,
    elevation: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  title: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
});

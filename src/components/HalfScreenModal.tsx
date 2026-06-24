/**
 * 咕噜 Gulu — 半屏弹窗容器
 * 对应需求文档 4.2 半屏弹窗交互
 * 从底部滑入，带圆角顶部和拖拽手柄，支持下拉关闭
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface HalfScreenModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 高度比例（0-1），默认 0.5 */
  heightRatio?: number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function HalfScreenModal({
  visible,
  onClose,
  title,
  children,
  heightRatio = 0.5,
}: HalfScreenModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80) {
          onClose();
          translateY.setValue(0);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = useCallback(() => {
    onClose();
    translateY.setValue(0);
  }, [onClose, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <Animated.View
          style={[
            styles.modal,
            {
              height: SCREEN_HEIGHT * heightRatio,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* 拖拽手柄 */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* 标题 */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeEmoji}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 内容（ScrollView 包裹防止内容溢出） */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ padding: theme.spacing.lg }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            {...(Platform.OS === 'web' ? { bounces: false } : {})}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textTertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeEmoji: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

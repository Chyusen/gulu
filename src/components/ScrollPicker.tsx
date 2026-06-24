/**
 * 咕噜 Gulu — 滚动式选择器组件
 * 对应需求文档 5.3 滚动式 Picker / 3.7 星座滚动条优化
 * 用于星座日期选择，替代 +/- 按钮
 * 支持：鼠标滚轮、触摸滑动、鼠标拖拽（Web）
 */

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { theme } from '../constants/theme';

interface ScrollPickerProps {
  /** 可选项列表，如 ['1月', '2月', ...] */
  data: string[];
  /** 当前选中索引 */
  selectedIndex: number;
  /** 选中变化回调 */
  onChange: (index: number) => void;
  /** 每项高度（默认 40） */
  itemHeight?: number;
  /** 可见项数（默认 5，奇数） */
  visibleItems?: number;
}

export function ScrollPicker({
  data,
  selectedIndex,
  onChange,
  itemHeight = 40,
  visibleItems = 5,
}: ScrollPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const containerHeight = itemHeight * visibleItems;
  const paddingCount = Math.floor(visibleItems / 2);

  /** 滚动到指定索引 */
  const scrollToIndex = useCallback((index: number, animated = true) => {
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    isProgrammaticScrollRef.current = true;
    scrollViewRef.current?.scrollTo({
      y: clamped * itemHeight,
      animated,
    });
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, animated ? 300 : 50);
  }, [data.length, itemHeight]);

  /** 初始化时滚动到选中项 */
  useEffect(() => {
    const timer = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** 选中变化时同步滚动位置 */
  useEffect(() => {
    if (!isDraggingRef.current) {
      scrollToIndex(selectedIndex, true);
    }
  }, [selectedIndex, scrollToIndex]);

  /** 滚动结束后吸附到最近项 */
  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticScrollRef.current) return;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / itemHeight);
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      if (clamped !== selectedIndex) {
        onChange(clamped);
      }
    },
    [data.length, itemHeight, onChange, selectedIndex],
  );

  /** 记录当前滚动偏移，供 Web 拖拽计算基准 */
  const currentOffsetRef = useRef(selectedIndex * itemHeight);

  /** 滚动中实时计算（防抖触发 onChange） */
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      currentOffsetRef.current = offsetY;
      if (isProgrammaticScrollRef.current) return;
      const index = Math.round(offsetY / itemHeight);
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      if (clamped !== selectedIndex) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          onChange(clamped);
        }, 200);
      }
    },
    [data.length, itemHeight, onChange, selectedIndex],
  );

  /** 计算每项的透明度和缩放 */
  const getItemStyle = useCallback(
    (index: number) => {
      const distance = Math.abs(index - selectedIndex);
      const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.3;
      const scale = distance === 0 ? 1.1 : 1.0;
      return { opacity, transform: [{ scale }] };
    },
    [selectedIndex],
  );

  const paddingBlocks = useMemo(
    () => Array.from({ length: paddingCount }, (_, i) => i),
    [paddingCount],
  );

  // ========== Web 端鼠标拖拽支持 ==========
  const dragStartYRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Platform.OS === 'web',
        onMoveShouldSetPanResponder: () => Platform.OS === 'web',
        onPanResponderGrant: (e: GestureResponderEvent) => {
          isDraggingRef.current = true;
          dragStartYRef.current = e.nativeEvent.pageY;
          // 以当前 ScrollView 滚动偏移为拖拽起点
          dragStartOffsetRef.current = currentOffsetRef.current;
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const delta = dragStartYRef.current - e.nativeEvent.pageY;
          dragStartYRef.current = e.nativeEvent.pageY;
          const maxOffset = Math.max(0, (data.length - 1) * itemHeight);
          const nextOffset = Math.max(0, Math.min(maxOffset, dragStartOffsetRef.current + delta));
          dragStartOffsetRef.current = nextOffset;
          scrollViewRef.current?.scrollTo({
            y: nextOffset,
            animated: false,
          });
        },
        onPanResponderRelease: () => {
          isDraggingRef.current = false;
        },
      }),
    [data.length, itemHeight],
  );

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      {...(Platform.OS === 'web' ? panResponder.panHandlers : {})}
    >
      {/* 中央高亮指示条 */}
      <View
        style={[
          styles.indicator,
          {
            top: (containerHeight - itemHeight) / 2,
            height: itemHeight,
          },
        ]}
      />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="normal"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.scrollContent}
      >
        {paddingBlocks.map((i) => (
          <View key={`pad-top-${i}`} style={{ height: itemHeight }} />
        ))}
        {data.map((item, index) => (
          <View
            key={`item-${index}`}
            style={[styles.item, { height: itemHeight }, getItemStyle(index)]}
          >
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
        {paddingBlocks.map((i) => (
          <View key={`pad-bottom-${i}`} style={{ height: itemHeight }} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.sm,
    opacity: 0.2,
    zIndex: 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  itemText: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});

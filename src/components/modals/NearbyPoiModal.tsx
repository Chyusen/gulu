/**
 * 咕噜 Gulu — 附近 POI 半屏弹窗
 * 三标签：酒店 / 美食 / 景点
 * 数据来源：高德地图 API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../constants/theme';
import { HalfScreenModal } from '../HalfScreenModal';
import { mapService } from '../../services/techPlanService';
import type { PoiItem } from '../../services/techPlanService';

interface NearbyPoiModalProps {
  visible: boolean;
  onClose: () => void;
  location: string; // "经度,纬度"
}

type PoiTab = 'hotel' | 'food' | 'scenic';

const TAB_CONFIG: { key: PoiTab; label: string; emoji: string; keywords: string }[] = [
  { key: 'hotel', label: '酒店', emoji: '🏨', keywords: '酒店' },
  { key: 'food', label: '美食', emoji: '🍜', keywords: '餐厅' },
  { key: 'scenic', label: '景点', emoji: '🏞️', keywords: '景点' },
];

export default function NearbyPoiModal({ visible, onClose, location }: NearbyPoiModalProps) {
  const [activeTab, setActiveTab] = useState<PoiTab>('hotel');
  const [loading, setLoading] = useState(false);
  const [poiMap, setPoiMap] = useState<Record<PoiTab, PoiItem[]>>({
    hotel: [],
    food: [],
    scenic: [],
  });

  const fetchPois = useCallback(async (tab: PoiTab) => {
    setLoading(true);
    try {
      const config = TAB_CONFIG.find((t) => t.key === tab)!;
      const result = await mapService.searchNearby(location, config.keywords, 2000);
      setPoiMap((prev) => ({ ...prev, [tab]: result.pois ?? [] }));
    } catch {
      // 降级处理
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (visible && poiMap[activeTab].length === 0) {
      fetchPois(activeTab);
    }
  }, [visible, activeTab, poiMap, fetchPois]);

  const handleTabChange = (tab: PoiTab) => {
    setActiveTab(tab);
    if (poiMap[tab].length === 0) {
      fetchPois(tab);
    }
  };

  const currentPois = poiMap[activeTab];

  return (
    <HalfScreenModal visible={visible} onClose={onClose} title="附近探索" heightRatio={0.6}>
      {/* 标签栏 */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* POI 列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>正在搜索附近的{TAB_CONFIG.find((t) => t.key === activeTab)?.label}…</Text>
        </View>
      ) : currentPois.length > 0 ? (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} nestedScrollEnabled>
          {currentPois.map((poi, idx) => (
            <View key={poi.id ?? idx} style={styles.poiCard}>
              <View style={styles.poiHeader}>
                <Text style={styles.poiName} numberOfLines={1}>{poi.name}</Text>
                {poi.distance && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{poi.distance}</Text>
                  </View>
                )}
              </View>
              {poi.address && (
                <Text style={styles.poiAddress} numberOfLines={1}>{poi.address}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyText}>附近暂无{TAB_CONFIG.find((t) => t.key === activeTab)?.label}数据</Text>
        </View>
      )}
    </HalfScreenModal>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  poiCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  poiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  poiName: {
    flex: 1,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  poiAddress: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
});

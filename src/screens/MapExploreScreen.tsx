/**
 * 咕噜 Gulu — 地图探索屏幕
 * 对应 tech-plan-2026 方案二
 * Web 端使用高德 JS API 降级，原生端使用 react-native-amap3d
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { theme } from '../constants/theme';
import { mapService, recommendationService } from '../services/techPlanService';
import { useUserStore } from '../stores/userStore';
import { MapView } from '../components/MapView';
import type { PoiItem, NearbyUser, Recommendation } from '../services/techPlanService';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function MapExploreScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useUserStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [poiResults, setPoiResults] = useState<PoiItem[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchKeywords, setSearchKeywords] = useState('');
  // Demo 固定区域：北京南锣鼓巷 / 什刹海 / 鼓楼
  const CENTER_COORD: [number, number] = [116.394, 39.942];
  const [currentLocation] = useState(`${CENTER_COORD[0]},${CENTER_COORD[1]}`);
  const [locationText, setLocationText] = useState('正在定位...');

  // 搜索 POI
  const handleSearchPoi = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mapService.searchNearby(currentLocation, searchKeywords, 1000);
      setPoiResults(result.pois || []);
    } catch (e) {
      console.warn('POI 搜索失败', e);
    } finally {
      setLoading(false);
    }
  }, [currentLocation, searchKeywords]);

  // 查询附近用户
  const handleFindNearbyUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mapService.getNearbyUsers(currentLocation, 1000, user?.id);
      setNearbyUsers(result.users || []);
    } catch (e) {
      console.warn('附近用户查询失败', e);
    } finally {
      setLoading(false);
    }
  }, [currentLocation, user?.id]);

  // 获取推荐内容
  const handleGetRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await recommendationService.recommend(
        user?.id || 'demo_user',
        5,
        user?.mbti,
        user?.zodiac
      );
      setRecommendations(result.recommendations || []);
    } catch (e) {
      console.warn('推荐失败', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.mbti, user?.zodiac]);

  // 逆地理编码获取当前位置名称
  useEffect(() => {
    (async () => {
      try {
        const result = await mapService.regeo(currentLocation);
        setLocationText(result.formatted_address || '未知位置');
      } catch {
        setLocationText('定位失败');
      }
    })();
  }, [currentLocation]);

  return (
    <View style={styles.container}>
      {/* 顶部位置信息 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>当前位置</Text>
          <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
        </View>
      </View>

      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索附近地点（如 咖啡馆）"
          value={searchKeywords}
          onChangeText={setSearchKeywords}
          onSubmitEditing={handleSearchPoi}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPoi}>
          <Text style={styles.searchBtnText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* 高德地图视图 */}
      <View style={styles.mapContainer}>
        <MapView
          center={CENTER_COORD}
          zoom={15}
          markers={[
            { lng: CENTER_COORD[0], lat: CENTER_COORD[1], title: '当前位置' },
            ...poiResults.map((poi) => ({
              lng: parseFloat(poi.location.split(',')[0]),
              lat: parseFloat(poi.location.split(',')[1]),
              title: poi.name,
            })),
          ]}
          circles={[{ lng: CENTER_COORD[0], lat: CENTER_COORD[1], radius: 500 }]}
        />
      </View>

      {/* 操作按钮 */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleFindNearbyUsers}>
          <Text style={styles.actionBtnIcon}>👥</Text>
          <Text style={styles.actionBtnText}>附近用户</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleGetRecommendations}>
          <Text style={styles.actionBtnIcon}>📋</Text>
          <Text style={styles.actionBtnText}>攻略推荐</Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {/* POI 结果 */}
        {poiResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 附近地点</Text>
            {poiResults.map((poi, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{poi.name}</Text>
                {poi.address ? <Text style={styles.cardDesc}>{poi.address}</Text> : null}
                {poi.distance ? <Text style={styles.cardMeta}>距离 {poi.distance}m</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* 附近用户 */}
        {nearbyUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 附近用户</Text>
            {nearbyUsers.map((u, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>用户 {u.user_id.slice(-6)}</Text>
                {u.distance != null && <Text style={styles.cardMeta}>距离 {u.distance}m</Text>}
              </View>
            ))}
          </View>
        )}

        {/* 推荐内容 */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 攻略推荐</Text>
            {recommendations.map((rec, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{rec.content.title}</Text>
                <Text style={styles.cardDesc}>{rec.content.summary}</Text>
                <Text style={styles.cardReason}>💡 {rec.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {!loading && poiResults.length === 0 && nearbyUsers.length === 0 && recommendations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧭</Text>
            <Text style={styles.emptyText}>点击上方按钮开始探索</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  backBtnText: {
    fontSize: 22,
    color: theme.colors.textPrimary,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchBtn: {
    paddingHorizontal: theme.spacing.md,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    height: 240,
    margin: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: 6,
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 4,
  },
  cardReason: {
    fontSize: 12,
    color: theme.colors.accent || '#e85d3c',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
});

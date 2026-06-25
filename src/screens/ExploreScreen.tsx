/**
 * 咕噜 Gulu — 探索界面重构
 * 对应需求文档 第四章 探索界面重构
 * 全屏高德地图为底，集成散步/运动/Citywalk/自主探索/附近/室内活动入口
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { MapView } from '../components/MapView';
import { ExplorePrivacyPanel } from '../components/ExplorePrivacyPanel';
import { HalfScreenModal } from '../components/HalfScreenModal';
import { PetStatusBar } from '../components/PetStatusBar';
import NearbyPoiModal from '../components/modals/NearbyPoiModal';
import { theme } from '../constants/theme';
import { useExploreStore } from '../stores/exploreStore';
import { useUserStore } from '../stores/userStore';
import { usePetStore } from '../stores/petStore';
import {
  mapService,
  recommendationService,
  type PoiItem,
  type Recommendation,
  type NearbyUser,
} from '../services/techPlanService';
import {
  AUTO_EXPLORE_STAMINA_PER_HOUR,
  AUTO_EXPLORE_MAX_HOURS,
} from '../constants/evolution';
import type { Pet, AutoExploreState } from '../types';

/** 默认坐标：北京南锣鼓巷 */
const DEFAULT_COORD: [number, number] = [116.394, 39.942];
/** 探索页推荐卡片本地缓存 key */
const RECOMMEND_CACHE_KEY = 'gulu-explore-recommendations';
/** 自主探索时长选项（小时） */
const DURATION_OPTIONS = [1, 2, 4, 8];

export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUserStore((s) => s.user);
  const pet = usePetStore((s) => s.pet);
  const isFirstVisit = useExploreStore((s) => s.isFirstVisit);
  const autoExplore = useExploreStore((s) => s.autoExplore);
  const startAutoExplore = useExploreStore((s) => s.startAutoExplore);
  const completeAutoExplore = useExploreStore((s) => s.completeAutoExplore);

  const [loading, setLoading] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAutoExplore, setShowAutoExplore] = useState(false);
  const [showNearbyUsers, setShowNearbyUsers] = useState(false);
  const [centerCoord, setCenterCoord] = useState<[number, number]>(DEFAULT_COORD);
  const [poiResults, setPoiResults] = useState<PoiItem[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [now, setNow] = useState(Date.now());
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [showRecommendCards, setShowRecommendCards] = useState(false);
  const [selectedRecommend, setSelectedRecommend] = useState<Recommendation | null>(null);
  const [selectedNearbyUser, setSelectedNearbyUser] = useState<NearbyUser | null>(null);
  const [showNearbyPoiModal, setShowNearbyPoiModal] = useState(false);
  const recommendScrollRef = useRef<ScrollView | null>(null);
  const recommendScrollX = useRef(0);
  const scrollRecommend = (direction: 'left' | 'right') => {
    const scroll = recommendScrollRef.current as any;
    if (!scroll) return;
    const distance = 290; // 卡片宽度 + 间距
    const targetX = Math.max(0, recommendScrollX.current + (direction === 'left' ? -distance : distance));
    if (typeof scroll.scrollTo === 'function') {
      scroll.scrollTo({ x: targetX, animated: true });
    }
  };

  // 自动探索中：每秒刷新倒计时
  useEffect(() => {
    if (!autoExplore.isExploring) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [autoExplore.isExploring]);

  // 获取用户当前位置，失败回退到默认坐标
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenterCoord([pos.coords.longitude, pos.coords.latitude]),
        () => setCenterCoord(DEFAULT_COORD),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setCenterCoord(DEFAULT_COORD);
    }
  }, []);

  // 加载周边 POI / 附近用户（推荐内容改为点击推荐按钮时才加载）
  useEffect(() => {
    let mounted = true;
    async function load() {
      const locationStr = `${centerCoord[0]},${centerCoord[1]}`;
      try {
        const [poiResult, usersResult] = await Promise.allSettled([
          mapService.searchNearby(locationStr, '', 1000),
          mapService.getNearbyUsers(locationStr, 1000, user?.id),
        ]);
        if (!mounted) return;
        if (poiResult.status === 'fulfilled') {
          setPoiResults(poiResult.value.pois ?? []);
        }
        if (usersResult.status === 'fulfilled') {
          setNearbyUsers(usersResult.value.users ?? []);
        }
      } catch {
        // 降级处理，不崩溃
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [centerCoord, user?.id]);

  // 首次进入自动弹出隐私面板
  useEffect(() => {
    if (isFirstVisit) {
      setShowPrivacy(true);
    }
  }, [isFirstVisit]);

  // 从本地缓存恢复推荐卡片，避免重复生成
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const cached = localStorage.getItem(RECOMMEND_CACHE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (parsed?.recommendations?.length > 0) {
        setRecommendations(parsed.recommendations);
      }
    } catch {
      // 忽略解析失败
    }
  }, []);

  // 地图标记：用户位置 + POI + 附近用户
  const mapMarkers = useMemo(() => {
    const markers: Array<{ lng: number; lat: number; title?: string }> = [
      { lng: centerCoord[0], lat: centerCoord[1], title: '我的位置' },
    ];
    poiResults.forEach((poi) => {
      const [lng, lat] = poi.location.split(',').map(Number);
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        markers.push({ lng, lat, title: poi.name });
      }
    });
    nearbyUsers.forEach((u) => {
      markers.push({ lng: u.lng, lat: u.lat, title: '附近用户' });
    });
    return markers;
  }, [centerCoord, poiResults, nearbyUsers]);

  const handleWalk = useCallback(() => {
    navigation.navigate('CompanionActivity', { mode: 'walk' });
  }, [navigation]);

  const handleSport = useCallback(() => {
    navigation.navigate('CompanionActivity', { mode: 'sport' });
  }, [navigation]);

  const handleCitywalk = useCallback(() => {
    navigation.navigate('Citywalk');
  }, [navigation]);

  const handleIndoor = useCallback(() => {
    navigation.navigate('CompanionActivity', { mode: 'indoor' });
  }, [navigation]);

  const handleAutoExplore = useCallback(() => {
    setShowAutoExplore(true);
  }, []);

  const handleWhisper = useCallback(() => {
    navigation.navigate('GuluWhisper');
  }, [navigation]);

  const handleCamera = useCallback(() => {
    Alert.alert('该功能正在精心打磨中，敬请期待～');
  }, []);

  // 点击推荐按钮：展开/收起推荐卡片，首次展开时获取推荐内容
  const handleRecommend = useCallback(async () => {
    if (recommendLoading) return;

    // 如果卡片已展开，点击则收起
    if (showRecommendCards) {
      setShowRecommendCards(false);
      return;
    }

    // 展开卡片：如果已有推荐内容直接展示，否则先获取
    setShowRecommendCards(true);
    if (recommendations.length > 0) return;

    setRecommendLoading(true);
    try {
      const locationStr = `${centerCoord[0]},${centerCoord[1]}`;
      const result = await recommendationService.recommend(
        user?.id ?? '',
        5,
        user?.mbti,
        user?.zodiac,
        locationStr,
      );
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
        // 缓存到本地：一次生成后固定显示
        if (Platform.OS === 'web') {
          try {
            localStorage.setItem(
              RECOMMEND_CACHE_KEY,
              JSON.stringify({
                recommendations: result.recommendations,
                location: result.location,
                userId: user?.id,
              })
            );
          } catch {
            // 忽略写入失败
          }
        }
      }
    } catch {
      // 获取失败时静默处理，卡片区域显示空状态
    } finally {
      setRecommendLoading(false);
    }
  }, [user?.id, user?.mbti, user?.zodiac, recommendLoading, showRecommendCards, recommendations.length, centerCoord]);

  const handleBlockOrReport = useCallback((targetNickname: string) => {
    Alert.alert(
      targetNickname,
      '如果遇到不舒服的内容，可以选择拉黑或举报～',
      [
        { text: '拉黑', style: 'destructive', onPress: () => Alert.alert('已拉黑', '不会再显示该用户的标记啦') },
        { text: '举报', style: 'default', onPress: () => Alert.alert('已举报', '我们会尽快处理，感谢你的反馈～') },
        { text: '取消', style: 'cancel' },
      ]
    );
  }, []);

  // 自主探索完成回调
  const handleAutoExploreComplete = useCallback(() => {
    const whisper = completeAutoExplore();
    if (whisper) {
      Alert.alert(
        '咕噜回来啦～',
        '它带回了小故事和礼物，快去看看吧～',
        [
          {
            text: '查看悄悄话',
            onPress: () => {
              setShowAutoExplore(false);
              navigation.navigate('GuluWhisper');
            },
          },
        ]
      );
    }
  }, [completeAutoExplore, navigation]);

  return (
    <View style={styles.container}>
      {/* 全屏地图背景 */}
      <View style={styles.mapContainer}>
        <MapView
          center={centerCoord}
          zoom={15}
          markers={mapMarkers}
          circles={[{ lng: centerCoord[0], lat: centerCoord[1], radius: 500 }]}
        />
      </View>

      {/* 加载中遮罩 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* 顶部区域：左上返回+宠物面板 + 右上按钮组 */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          {/* 返回按钮 */}
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Image source={require('../assets/images/ui/icons/system/back_icon.png')} style={styles.backButtonIcon} />
          </TouchableOpacity>

          {pet && (
            <PetStatusBar
              pet={pet}
              onPress={() => {}}
            />
          )}

          {/* 附近用户入口 */}
          <TouchableOpacity
            style={styles.nearbyChip}
            activeOpacity={0.8}
            onPress={() => setShowNearbyUsers(true)}
          >
            <Text style={styles.nearbyChipText}>📍 附近 {nearbyUsers.length} 位小伙伴</Text>
          </TouchableOpacity>
        </View>

        {/* 右上按钮组：设置 / 咕噜自己玩 / 咕噜悄悄话 */}
        <View style={styles.topRightButtons}>
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/system/settings_icon.png')} style={styles.roundButtonIcon} />} onPress={() => setShowPrivacy(true)} />
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/pet/paw_icon.png')} style={styles.roundButtonIcon} />} label="咕噜自己玩" onPress={handleAutoExplore} />
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/pet/letter_icon.png')} style={styles.roundButtonIcon} />} label="咕噜悄悄话" onPress={handleWhisper} />
        </View>
      </View>

      {/* 左侧推荐按钮 */}
      <View style={styles.leftSide}>
        <RoundButton
          icon={
            recommendLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Image source={require('../assets/images/ui/icons/recommend/thumbs_icon.png')} style={styles.roundButtonIcon} />
            )
          }
          label="推荐"
          onPress={handleRecommend}
        />
      </View>

      {/* 附近用户标记：右侧浮动头像列表，可点击弹出信息卡片 */}
      {nearbyUsers.length > 0 && (
        <View style={styles.nearbyMarkers}>
          {nearbyUsers.slice(0, 5).map((u, idx) => (
            <TouchableOpacity
              key={u.user_id ?? idx}
              style={styles.nearbyMarkerBtn}
              activeOpacity={0.7}
              onPress={() => setSelectedNearbyUser(u)}
            >
              <Text style={styles.nearbyMarkerEmoji}>🐾</Text>
              {u.distance != null && (
                <Text style={styles.nearbyMarkerDist}>{Math.round(u.distance)}m</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 推荐内容浮动卡片：点击推荐按钮展开，可水平滑动 + 点击查看详情 */}
      {showRecommendCards && (
        <View style={styles.recommendCards}>
          {recommendLoading ? (
            <View style={styles.recommendLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.recommendLoadingText}>AI 正在为你挑选…</Text>
            </View>
          ) : recommendations.length > 0 ? (
            <View style={styles.recommendCardsWrapper}>
              <TouchableOpacity
                style={[styles.recommendArrow, styles.recommendArrowLeft]}
                onPress={() => scrollRecommend('left')}
                activeOpacity={0.7}
              >
                <Text style={styles.recommendArrowText}>‹</Text>
              </TouchableOpacity>
              <ScrollView
                ref={recommendScrollRef}
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.recommendScroll}
                style={styles.recommendScrollView}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                pagingEnabled={false}
                onScroll={(e) => {
                  recommendScrollX.current = e.nativeEvent.contentOffset.x;
                }}
                scrollEventThrottle={100}
              >
                {recommendations.map((rec, idx) => (
                  <TouchableOpacity
                    key={rec.content.external_id ?? idx}
                    style={styles.recommendCard}
                    activeOpacity={0.8}
                    onPress={() => setSelectedRecommend(rec)}
                  >
                    <View style={styles.recommendCardHeader}>
                      <Text style={styles.recommendTitle} numberOfLines={1}>
                        {rec.content.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleBlockOrReport(rec.content.platform)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.recommendMore}>···</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.recommendSummary} numberOfLines={2}>
                      {rec.content.summary}
                    </Text>
                    <Text style={styles.recommendReason} numberOfLines={1}>
                      ✨ {rec.reason}
                    </Text>
                    <Text style={styles.recommendSource}>数据来源：高德地图 · AI 个性化推荐</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.recommendArrow, styles.recommendArrowRight]}
                onPress={() => scrollRecommend('right')}
                activeOpacity={0.7}
              >
                <Text style={styles.recommendArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recommendEmpty}>
              <Text style={styles.recommendEmptyText}>暂无推荐，稍后再来看看吧～</Text>
            </View>
          )}
        </View>
      )}

      {/* 底部区域：左下活动入口 + 右下相机 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeftButtons}>
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/explore/walk_icon.png')} style={styles.roundButtonIcon} />} label="散步" onPress={handleWalk} />
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/explore/exercise_icon.png')} style={styles.roundButtonIcon} />} label="运动" onPress={handleSport} />
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/explore/citywalk_icon.png')} style={styles.roundButtonIcon} />} label="Citywalk" onPress={handleCitywalk} />
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/explore/indoor_icon.png')} style={styles.roundButtonIcon} />} label="室内陪伴" onPress={handleIndoor} />
        </View>
        <View style={styles.bottomRightButtons}>
          <RoundButton icon={<Text style={styles.nearbyIcon}>📍</Text>} label="附近" onPress={() => setShowNearbyPoiModal(true)} />
          <RoundButton icon={<Image source={require('../assets/images/ui/icons/publish/camera_icon.png')} style={styles.roundButtonIcon} />} onPress={handleCamera} />
        </View>
      </View>

      {/* 咕噜自己玩弹窗：复用 AutoExploreScreen 逻辑 */}
      <HalfScreenModal
        visible={showAutoExplore}
        onClose={() => setShowAutoExplore(false)}
        title="咕噜自己玩"
        heightRatio={0.65}
      >
        <AutoExploreModalContent
          pet={pet}
          autoExplore={autoExplore}
          startAutoExplore={startAutoExplore}
          onComplete={handleAutoExploreComplete}
          now={now}
        />
      </HalfScreenModal>

      {/* 附近用户弹窗 */}
      <HalfScreenModal
        visible={showNearbyUsers}
        onClose={() => setShowNearbyUsers(false)}
        title="附近的小伙伴"
        heightRatio={0.4}
      >
        <NearbyUsersContent users={nearbyUsers} onReport={handleBlockOrReport} />
      </HalfScreenModal>

      {/* 隐私设置面板 */}
      <ExplorePrivacyPanel
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        isFirstTime={isFirstVisit}
      />

      {/* 附近 POI 半屏弹窗（酒店/美食/景点） */}
      <NearbyPoiModal
        visible={showNearbyPoiModal}
        onClose={() => setShowNearbyPoiModal(false)}
        location={`${centerCoord[0]},${centerCoord[1]}`}
      />

      {/* 推荐内容详情弹窗 */}
      <HalfScreenModal
        visible={selectedRecommend !== null}
        onClose={() => setSelectedRecommend(null)}
        title="攻略详情"
        heightRatio={0.5}
      >
        {selectedRecommend && (
          <ScrollView style={styles.recommendDetailScroll} contentContainerStyle={{ gap: theme.spacing.sm }}>
            <Text style={styles.recommendDetailTitle}>{selectedRecommend.content.title}</Text>
            <View style={styles.recommendDetailReasonBox}>
              <Text style={styles.recommendDetailReasonText}>✨ {selectedRecommend.reason}</Text>
            </View>
            <Text style={styles.recommendDetailSummary}>{selectedRecommend.content.summary}</Text>
            <View style={styles.recommendDetailTags}>
              {selectedRecommend.content.tags?.map((tag, i) => (
                <View key={i} style={styles.recommendDetailTag}>
                  <Text style={styles.recommendDetailTagText}>#{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.recommendDetailSource}>
              数据来源：{selectedRecommend.content.platform === 'xhs' ? '小红书' : '高德地图'} · AI 个性化推荐
            </Text>
          </ScrollView>
        )}
      </HalfScreenModal>

      {/* 附近用户信息卡片弹窗 */}
      <HalfScreenModal
        visible={selectedNearbyUser !== null}
        onClose={() => setSelectedNearbyUser(null)}
        title="附近的小伙伴"
        heightRatio={0.35}
      >
        {selectedNearbyUser && (
          <View style={styles.nearbyUserInfoCard}>
            <View style={styles.nearbyUserInfoHeader}>
              <Text style={styles.nearbyUserInfoAvatar}>🐾</Text>
              <View style={styles.nearbyUserInfoMain}>
                <Text style={styles.nearbyUserInfoName}>
                  小伙伴 {selectedNearbyUser.user_id.slice(-4)}
                </Text>
                {selectedNearbyUser.distance != null && (
                  <Text style={styles.nearbyUserInfoDistance}>
                    距离你 {Math.round(selectedNearbyUser.distance)}m
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.nearbyUserInfoDesc}>
              这是一位也在使用咕噜的小伙伴，也许你们可以一起 Citywalk～
            </Text>
            <View style={styles.nearbyUserInfoActions}>
              <TouchableOpacity
                style={styles.nearbyUserInfoBtn}
                onPress={() => {
                  Alert.alert('打招呼', '已发送友好的问候～');
                  setSelectedNearbyUser(null);
                }}
              >
                <Text style={styles.nearbyUserInfoBtnText}>打个招呼</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nearbyUserInfoBtn, styles.nearbyUserInfoBtnSecondary]}
                onPress={() => {
                  setSelectedNearbyUser(null);
                  handleBlockOrReport(`小伙伴 ${selectedNearbyUser.user_id.slice(-4)}`);
                }}
              >
                <Text style={styles.nearbyUserInfoBtnText}>更多</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </HalfScreenModal>
    </View>
  );
}

// ========== 圆形按钮 ==========

interface RoundButtonProps {
  icon: React.ReactNode;
  label?: string;
  onPress: () => void;
}

function RoundButton({ icon, label, onPress }: RoundButtonProps) {
  return (
    <View style={styles.roundButtonWrap}>
      <TouchableOpacity style={styles.roundButton} activeOpacity={0.8} onPress={onPress}>
        {icon}
      </TouchableOpacity>
      {label && <Text style={styles.roundButtonLabel}>{label}</Text>}
    </View>
  );
}

// ========== 自主探索弹窗内容（复用 AutoExploreScreen 逻辑） ==========

interface AutoExploreModalContentProps {
  pet: Pet | null;
  autoExplore: AutoExploreState;
  startAutoExplore: (duration: number, stageNumber: 1 | 2 | 3) => boolean;
  onComplete: () => void;
  now: number;
}

function AutoExploreModalContent({
  pet,
  autoExplore,
  startAutoExplore,
  onComplete,
  now,
}: AutoExploreModalContentProps) {
  const [selectedDuration, setSelectedDuration] = useState(2);

  if (!pet) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>还没有咕噜哦，先去领养一只吧～</Text>
      </View>
    );
  }

  // 探索中：显示剩余时间
  if (autoExplore.isExploring) {
    const remainingSeconds =
      autoExplore.startedAt && autoExplore.duration
        ? Math.max(
            0,
            autoExplore.duration * 3600 -
              Math.floor((now - new Date(autoExplore.startedAt).getTime()) / 1000)
          )
        : 0;
    return (
      <View style={styles.autoExploreProgress}>
        <Text style={styles.autoExploreProgressTitle}>咕噜正在外面探险 🐾</Text>
        <Text style={styles.autoExploreProgressSubtitle}>
          它可能在交朋友，也可能发现了一片安静的草地～
        </Text>
        <Text style={styles.autoExploreTimer}>
          剩余 {Math.floor(remainingSeconds / 3600)}h{' '}
          {Math.floor((remainingSeconds % 3600) / 60)}m {remainingSeconds % 60}s
        </Text>
        <TouchableOpacity style={styles.autoExploreRecallBtn} onPress={onComplete}>
          <Text style={styles.autoExploreRecallBtnText}>提前召回咕噜</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 待命：选择时长并出发
  const maxHours = AUTO_EXPLORE_MAX_HOURS[pet.stageNumber];
  const availableDurations = DURATION_OPTIONS.filter((h) => h <= maxHours);
  const staminaPerHour = AUTO_EXPLORE_STAMINA_PER_HOUR[pet.stageNumber];
  const estimatedCost = selectedDuration * staminaPerHour;
  const staminaInsufficient = pet.stamina < estimatedCost;

  const handleStart = () => {
    const ok = startAutoExplore(selectedDuration, pet.stageNumber);
    if (!ok) {
      Alert.alert('体力不足', `这次外出预计需要 ${estimatedCost} 点体力，先让咕噜吃点东西吧～`);
    }
  };

  return (
    <View style={styles.autoExploreContent}>
      <Text style={styles.autoExploreSectionTitle}>选择外出时长</Text>
      <View style={styles.durationRow}>
        {availableDurations.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.durationBtn, selectedDuration === h && styles.durationBtnSelected]}
            onPress={() => setSelectedDuration(h)}
          >
            <Text
              style={[
                styles.durationBtnText,
                selectedDuration === h && styles.durationBtnTextSelected,
              ]}
            >
              {h}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.autoExploreInfoCard}>
        <Text style={styles.autoExploreInfoTitle}>预计消耗</Text>
        <Text style={styles.autoExploreInfoRow}>体力：-{estimatedCost}</Text>
        <Text style={styles.autoExploreInfoRow}>
          能量：+{Math.floor(15 * selectedDuration * pet.stageNumber)}
        </Text>
        <Text style={styles.autoExploreInfoRow}>
          咕噜币：+{Math.floor(10 * selectedDuration * pet.stageNumber)}
        </Text>
        <Text style={styles.autoExploreInfoHint}>当前阶段消耗 {staminaPerHour}/h</Text>
      </View>

      <TouchableOpacity
        style={[styles.autoExploreStartBtn, staminaInsufficient && styles.autoExploreStartBtnDisabled]}
        onPress={handleStart}
        disabled={staminaInsufficient}
      >
        <Text style={styles.autoExploreStartBtnText}>
          {staminaInsufficient ? '体力不足，先喂点吃的吧' : '让咕噜出发吧'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ========== 附近用户列表 ==========

interface NearbyUsersContentProps {
  users: NearbyUser[];
  onReport: (nickname: string) => void;
}

function NearbyUsersContent({ users, onReport }: NearbyUsersContentProps) {
  if (users.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>附近暂时没有其他小伙伴～</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.nearbyList} contentContainerStyle={{ gap: theme.spacing.sm }}>
      {users.map((u, idx) => {
        const nickname = `小伙伴 ${u.user_id.slice(-4)}`;
        return (
          <View key={u.user_id ?? idx} style={styles.nearbyItem}>
            <Text style={styles.nearbyItemAvatar}>🐾</Text>
            <View style={styles.nearbyItemInfo}>
              <Text style={styles.nearbyItemName}>{nickname}</Text>
              {u.distance != null && (
                <Text style={styles.nearbyItemDistance}>距离 {Math.round(u.distance)}m</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.nearbyItemMore}
              onPress={() => onReport(nickname)}
            >
              <Text style={styles.nearbyItemMoreText}>···</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ========== 样式 ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.background}CC`,
    zIndex: 10,
  },

  // 顶部区域
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: theme.spacing.md,
    zIndex: 2,
  },
  topLeft: {
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  topRightButtons: {
    gap: theme.spacing.sm,
    alignItems: 'center',
  },

  // 左侧推荐按钮
  leftSide: {
    position: 'absolute',
    left: theme.spacing.md,
    top: '45%',
    zIndex: 2,
  },

  // 推荐内容浮动卡片
  recommendCards: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 2,
    maxHeight: 130,
  },
  recommendCardsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendArrow: {
    width: 28,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  recommendArrowLeft: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginRight: 4,
  },
  recommendArrowRight: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    marginLeft: 4,
  },
  recommendArrowText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  recommendScrollView: {
    flex: 1,
  },
  recommendScroll: {
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
  },
  recommendCard: {
    width: 280,
    height: 100,
    backgroundColor: 'rgba(42, 44, 48, 0.75)',
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(80, 83, 89, 0.5)',
    marginRight: theme.spacing.md,
  },
  recommendCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendTitle: {
    flex: 1,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recommendMore: {
    fontSize: 18,
    color: '#B0B5BD',
    marginLeft: theme.spacing.sm,
  },
  recommendSummary: {
    fontSize: theme.fontSize.caption,
    color: '#B0B5BD',
    marginTop: 4,
  },
  recommendReason: {
    fontSize: 10,
    color: '#8B9BF5',
    marginTop: 4,
    fontWeight: '500',
  },
  recommendSource: {
    fontSize: 10,
    color: '#B0B5BD',
    marginTop: 4,
  },
  recommendLoading: {
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(42, 44, 48, 0.75)',
    borderRadius: 12,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  recommendLoadingText: {
    fontSize: theme.fontSize.caption,
    color: '#B0B5BD',
  },
  recommendEmpty: {
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(42, 44, 48, 0.75)',
    borderRadius: 12,
    alignItems: 'center',
  },
  recommendEmptyText: {
    fontSize: theme.fontSize.caption,
    color: '#B0B5BD',
  },

  // 底部区域
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    zIndex: 2,
  },
  bottomLeftButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomRightButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  nearbyIcon: {
    fontSize: 24,
    color: theme.colors.textPrimary,
  },

  // 圆形按钮
  roundButtonWrap: {
    alignItems: 'center',
  },
  roundButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(45, 48, 53, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 83, 89, 0.6)',
  },
  roundButtonIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  roundButtonLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // 返回按钮
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 48, 53, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 83, 89, 0.6)',
  },
  backButtonIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  // 紧凑宠物面板
  petPanel: {
    width: 160,
    backgroundColor: 'rgba(36, 38, 41, 0.78)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(80, 83, 89, 0.5)',
  },
  petPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  petPanelName: {
    flex: 1,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 4,
  },
  petPanelStage: {
    fontSize: 10,
    color: '#B0B5BD',
  },
  energyBarBg: {
    height: 4,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  petPanelEnergy: {
    fontSize: 10,
    color: '#B0B5BD',
    marginTop: 4,
  },
  petPanelExtra: {
    marginTop: 4,
    gap: 2,
  },
  petPanelExtraText: {
    fontSize: 10,
    color: '#B0B5BD',
  },

  // 附近用户入口
  nearbyChip: {
    backgroundColor: 'rgba(36, 38, 41, 0.78)',
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(80, 83, 89, 0.5)',
  },
  nearbyChipText: {
    fontSize: 10,
    color: '#B0B5BD',
  },

  // 空状态
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },

  // 自主探索弹窗 - 选择时长
  autoExploreContent: {
    gap: theme.spacing.md,
  },
  autoExploreSectionTitle: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textSecondary,
  },
  durationRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  durationBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBtnSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationBtnText: {
    fontSize: theme.fontSize.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  durationBtnTextSelected: {
    color: theme.colors.textInverse,
  },
  autoExploreInfoCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 4,
  },
  autoExploreInfoTitle: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  autoExploreInfoRow: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  autoExploreInfoHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  autoExploreStartBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  autoExploreStartBtnDisabled: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  autoExploreStartBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '600',
  },

  // 自主探索弹窗 - 探索中
  autoExploreProgress: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  autoExploreProgressTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  autoExploreProgressSubtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  autoExploreTimer: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
    fontVariant: ['tabular-nums'],
    marginVertical: theme.spacing.md,
  },
  autoExploreRecallBtn: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  autoExploreRecallBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },

  // 附近用户列表
  nearbyList: {
    flex: 1,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  nearbyItemAvatar: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  nearbyItemInfo: {
    flex: 1,
  },
  nearbyItemName: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  nearbyItemDistance: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  nearbyItemMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyItemMoreText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },

  // 附近用户浮动标记
  nearbyMarkers: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '40%',
    zIndex: 3,
    gap: 10,
    alignItems: 'center',
  },
  nearbyMarkerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(36, 38, 41, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 115, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyMarkerEmoji: {
    fontSize: 20,
  },
  nearbyMarkerDist: {
    fontSize: 8,
    color: '#B0B5BD',
    marginTop: 1,
  },

  // 推荐详情弹窗
  recommendDetailScroll: {
    flex: 1,
  },
  recommendDetailTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
  recommendDetailReasonBox: {
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  recommendDetailReasonText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.primary,
    fontWeight: '600',
    lineHeight: 22,
  },
  recommendDetailSummary: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  recommendDetailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recommendDetailTag: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendDetailTagText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  recommendDetailSource: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },

  // 附近用户信息卡片
  nearbyUserInfoCard: {
    gap: theme.spacing.md,
  },
  nearbyUserInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  nearbyUserInfoAvatar: {
    fontSize: 40,
  },
  nearbyUserInfoMain: {
    flex: 1,
  },
  nearbyUserInfoName: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nearbyUserInfoDistance: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  nearbyUserInfoDesc: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  nearbyUserInfoActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  nearbyUserInfoBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  nearbyUserInfoBtnSecondary: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  nearbyUserInfoBtnText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
});

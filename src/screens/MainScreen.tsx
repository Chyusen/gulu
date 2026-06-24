/**
 * 咕噜 Gulu — 新主界面（宠物中心式）
 * 对应需求文档 三、主界面导航重构
 * 宠物固定屏幕中央，底部三按钮，侧边可展开菜单
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { PetAvatar } from '../components/PetAvatar';
import { PetStatusBar } from '../components/PetStatusBar';
import { BottomNavBar } from '../components/BottomNavBar';
import { SideMenu } from '../components/SideMenu';
import { HalfScreenModal } from '../components/HalfScreenModal';
import { FullScreenModal } from '../components/FullScreenModal';
import { FloatingBubble } from '../components/FloatingBubble';
import { FriendListModal } from '../components/modals/FriendListModal';
import { TaskModal } from '../components/modals/TaskModal';
import ShopInventoryModal from '../components/modals/ShopInventoryModal';
import { PetInteractionWheel, type InteractionType } from '../components/PetInteractionWheel';
import { PetDetailPanel } from '../components/PetDetailPanel';
import { ProfileView } from '../components/ProfileView';
import { Background } from '../components/Background';
import { FoodCard } from '../components/FoodCard';
import { EvolutionCeremony } from '../components/EvolutionCeremony';
import { theme } from '../constants/theme';
import { FOODS } from '../constants/foods';
import { SCENE_ITEM_TO_KEY, ACCESSORY_ITEM_TO_KEY, ACCESSORY_POSITIONS } from '../constants/shopItems';
import { usePetStore } from '../stores/petStore';
import { useUserStore } from '../stores/userStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useImmersiveChatStore } from '../stores/immersiveChatStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { chatService } from '../services/chatService';
import { AssetManager } from '../utils/AssetManager';
import type { Food, PetState } from '../types';

type PanelType = 'feed' | 'settings' | 'costume' | 'status' | null;
type FullScreenType = 'profile' | null;

/** 饰品叠加层：根据饰品类型渲染在宠物正确位置 */
function AccessoryOverlay({
  source,
  accessoryKey,
  petSize,
}: {
  source: ImageSourcePropType;
  accessoryKey: string;
  petSize: number;
}) {
  const position = ACCESSORY_POSITIONS[accessoryKey] ?? { x: 0, y: 0, scale: 0.6 };
  const size = petSize * position.scale;
  return (
    <Image
      source={source}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: petSize / 2 + position.x - size / 2,
        top: petSize / 2 + position.y - size / 2,
      }}
      resizeMode="contain"
    />
  );
}

/** 宠物气泡可出现的槽位（相对宠物中心） */
const PET_BUBBLE_SLOTS = [
  { x: 0, y: -160 },    // 正上方
  { x: -140, y: -80 },  // 左上方
  { x: 140, y: -80 },   // 右上方
  { x: -150, y: 10 },   // 左侧
  { x: 150, y: 10 },    // 右侧
];

export function MainScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pet = usePetStore((s) => s.pet);
  const user = useUserStore((s) => s.user);
  const feedFood = usePetStore((s) => s.feedFood);
  const feedBasicFood = usePetStore((s) => s.feedBasicFood);
  const basicFoodsFedToday = usePetStore((s) => s.basicFoodsFedToday);
  const checkEvolution = usePetStore((s) => s.checkEvolution);
  const evolve = usePetStore((s) => s.evolve);
  const updateLastInteraction = usePetStore((s) => s.updateLastInteraction);
  const setEmotion = usePetStore((s) => s.setEmotion);
  const { inventory, consumeItem } = useInventoryStore();
  const starDust = useCurrencyStore((s) => s.starDust);
  const guluCoin = useCurrencyStore((s) => s.guluCoin);

  // 面板/全屏状态
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [activeFullScreen, setActiveFullScreen] = useState<FullScreenType>(null);

  // 弹窗状态
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showShopInventoryModal, setShowShopInventoryModal] = useState(false);

  // 对话输入
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [inputText, setInputText] = useState('');

  // 互动轮盘
  const [showInteractionWheel, setShowInteractionWheel] = useState(false);
  const [interactionAnim, setInteractionAnim] = useState<InteractionType | null>(null);

  // 进化仪式
  const [evolutionCeremony, setEvolutionCeremony] = useState<{
    visible: boolean;
    fromStage: 1 | 2 | 3;
    toStage: 1 | 2 | 3;
  } | null>(null);

  // 动画
  const petTranslateY = useRef(new Animated.Value(0)).current;
  const sideOpacity = useRef(new Animated.Value(1)).current;
  const inputOpacity = useRef(new Animated.Value(0)).current;
  const evolutionPulse = useRef(new Animated.Value(1)).current;

  // 气泡
  const visibleBubbles = useImmersiveChatStore((s) => s.visibleBubbles);
  const addBubble = useImmersiveChatStore((s) => s.addBubble);
  const removeBubble = useImmersiveChatStore((s) => s.removeBubble);

  // 气泡位置管理：宠物气泡在宠物周围随机槽位，避免重叠
  const bubblePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const displayedBubbles = visibleBubbles.slice(-3);

  const bubblesWithPosition = useMemo(() => {
    const usedSlots = new Set<number>();

    return displayedBubbles.map((bubble) => {
      // 用户气泡固定在宠物下方
      if (bubble.role === 'user') {
        return { bubble, position: { x: 0, y: 130 } };
      }

      // 行动闭环提示固定在宠物顶部中央
      const isActionPrompt = bubble.hasAction && bubble.actionText && !bubble.actionCompleted && !bubble.actionRejected;
      if (isActionPrompt) {
        return { bubble, position: { x: 0, y: -170 } };
      }

      // 宠物气泡在周围槽位中随机选择未占用的位置
      let position = bubblePositionsRef.current.get(bubble.id);
      if (!position) {
        const availableSlots = PET_BUBBLE_SLOTS.map((_, i) => i).filter((i) => !usedSlots.has(i));
        const slotIndex =
          availableSlots.length > 0
            ? availableSlots[Math.floor(Math.random() * availableSlots.length)]
            : Math.floor(Math.random() * PET_BUBBLE_SLOTS.length);
        usedSlots.add(slotIndex);
        position = PET_BUBBLE_SLOTS[slotIndex];
        bubblePositionsRef.current.set(bubble.id, position);
      } else {
        const slotIndex = PET_BUBBLE_SLOTS.findIndex((s) => s.x === position!.x && s.y === position!.y);
        if (slotIndex >= 0) usedSlots.add(slotIndex);
      }
      return { bubble, position };
    });
  }, [displayedBubbles]);

  // 清理已消失气泡的位置缓存
  useEffect(() => {
    const currentIds = new Set(displayedBubbles.map((b) => b.id));
    for (const id of bubblePositionsRef.current.keys()) {
      if (!currentIds.has(id)) {
        bubblePositionsRef.current.delete(id);
      }
    }
  }, [displayedBubbles]);

  // 进化之光脉冲动画
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(evolutionPulse, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(evolutionPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [evolutionPulse]);



  const evolutionCheck = checkEvolution();

  // 键盘弹出时宠物上移 + 侧边隐藏
  useEffect(() => {
    Animated.parallel([
      Animated.timing(petTranslateY, {
        toValue: isInputExpanded ? -80 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(sideOpacity, {
        toValue: isInputExpanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(inputOpacity, {
        toValue: isInputExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isInputExpanded, petTranslateY, sideOpacity, inputOpacity]);

  // ========== 对话 ==========
  const handleChatToggle = useCallback(() => {
    setIsInputExpanded((prev) => !prev);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !pet) return;
    const userMessage = inputText.trim();
    setInputText('');

    // 添加用户气泡
    addBubble({
      id: `user-${Date.now()}`,
      content: userMessage,
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await chatService.sendMessage({
        user_id: user?.id ?? '',
        pet_id: pet.id,
        message: userMessage,
      });
      addBubble({
        id: `pet-${Date.now()}`,
        content: response.reply,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      });
      if (response.petStateChange?.emotionChange) {
        setEmotion(response.petStateChange.emotionChange);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '网络异常';
      addBubble({
        id: `err-${Date.now()}`,
        content: `...让我想想...\n（${errMsg}）`,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      });
    }
  }, [addBubble, inputText, pet, setEmotion, user?.id]);

  // ========== 喂食 ==========
  const basicBiscuit = FOODS.find((f) => f.isBasic) ?? FOODS[0];
  const foodInventoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((i) => {
      if (i.itemType === 'food') {
        map[i.itemId] = (map[i.itemId] ?? 0) + (i.quantity ?? 1);
      }
    });
    return map;
  }, [inventory]);

  // 已装备的场景：用于切换主界面背景
  const equippedSceneKey = useMemo(() => {
    const equipped = inventory.find((i) => i.isEquipped && i.itemType === 'scene');
    if (!equipped) return 'home';
    return SCENE_ITEM_TO_KEY[equipped.itemId] ?? 'home';
  }, [inventory]);

  // 已装备的饰品：用于在宠物身上显示
  const equippedAccessory = useMemo(() => {
    const equipped = inventory.find((i) => i.isEquipped && i.itemType === 'accessory');
    if (!equipped) return null;
    const accessoryKey = ACCESSORY_ITEM_TO_KEY[equipped.itemId];
    if (!accessoryKey) return null;
    const source = AssetManager.getAccessory(accessoryKey);
    if (!source) return null;
    return { source, key: accessoryKey };
  }, [inventory]);
  const equippedAccessorySource = equippedAccessory?.source ?? null;
  const equippedAccessoryKey = equippedAccessory?.key ?? null;

  const handleFeedFood = useCallback((food: Food, source: 'basic' | 'inventory') => {
    if (source === 'basic') {
      const ok = feedBasicFood();
      if (!ok) {
        addBubble({
          id: `feed-limit-${Date.now()}`,
          content: '今天的咕噜小饼干已经吃完啦，明天再来吧～',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        });
        return;
      }
    } else {
      const ok = consumeItem(food.id);
      if (!ok) {
        addBubble({
          id: `feed-empty-${Date.now()}`,
          content: '这个食物没有库存啦，先去商店买一些吧～',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        });
        return;
      }
    }

    const result = feedFood(food);
    updateLastInteraction();
    setActivePanel(null);
    addBubble({
      id: `feed-${Date.now()}`,
      content: `好吃！谢谢你！体力 +${result.staminaGain}，亲密 +${result.intimacyGain}`,
      role: 'assistant',
      createdAt: new Date().toISOString(),
    });
  }, [addBubble, consumeItem, feedBasicFood, feedFood, updateLastInteraction]);

  // ========== 互动 ==========
  const handleInteract = useCallback((type: InteractionType) => {
    const messages: Record<InteractionType, string> = {
      pet: '好舒服~',
      poke: '哎呀！',
      hug: '抱抱！我好喜欢你~',
      kiss: 'mua~ 我也爱你',
    };
    setInteractionAnim(type);
    setTimeout(() => setInteractionAnim(null), 1000);
    addBubble({
      id: `interact-${Date.now()}`,
      content: messages[type],
      role: 'assistant',
      createdAt: new Date().toISOString(),
    });
    updateLastInteraction();
  }, [addBubble, updateLastInteraction]);

  const handlePetClick = useCallback(() => {
    if (showInteractionWheel) {
      setShowInteractionWheel(false);
      return;
    }
    handleInteract('pet');
  }, [handleInteract, showInteractionWheel]);

  const handlePetLongPress = useCallback(() => {
    setShowInteractionWheel(true);
  }, []);

  const handleInteractionSelect = useCallback((type: InteractionType) => {
    setShowInteractionWheel(false);
    handleInteract(type);
  }, [handleInteract]);

  // ========== 导航 ==========
  const handleExplore = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  const handleProfile = useCallback(() => {
    setActiveFullScreen('profile');
  }, []);

  const handleFullScreenClose = useCallback(() => {
    setActiveFullScreen(null);
  }, []);

  const handleOpenShop = useCallback(() => {
    setShowShopInventoryModal(true);
  }, []);

  const handleEvolve = useCallback(() => {
    if (!pet) return;
    const fromStage = pet.stageNumber as 1 | 2 | 3;
    const result = evolve();
    if (result.success && result.toStage) {
      setEvolutionCeremony({ visible: true, fromStage, toStage: result.toStage as 1 | 2 | 3 });
    }
  }, [evolve, pet]);

  const handleEvolutionComplete = useCallback(() => {
    setEvolutionCeremony(null);
    const stageNames: Record<number, string> = { 1: '幼崽期', 2: '伴生期', 3: '觉醒期' };
    const toStage = evolutionCeremony?.toStage ?? pet?.stageNumber ?? 1;
    addBubble({
      id: `evolve-${Date.now()}`,
      content: `✨ 我进化到${stageNames[toStage]}啦！解锁了新的互动和对话风格～`,
      role: 'assistant',
      createdAt: new Date().toISOString(),
    });
    setEmotion('happy');
  }, [addBubble, evolutionCeremony?.toStage, pet?.stageNumber, setEmotion]);

  if (!pet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>还没有宠物</Text>
      </View>
    );
  }

  const petState: PetState = pet.isGraying
    ? 'graying'
    : pet.isDormant
    ? 'dormant'
    : pet.currentEmotion === 'happy'
    ? 'happy'
    : pet.currentEmotion === 'sad'
    ? 'sad'
    : 'normal';

  const feedIconSource = AssetManager.getButtonIcon('btn_feed');
  const friendsIconSource = AssetManager.getButtonIcon('btn_friends');

  // 左侧菜单项：喂食 + 好友
  const leftItems = [
    { key: 'feed', icon: feedIconSource ? <Image source={feedIconSource} style={styles.sideMenuIcon} /> : <Text style={styles.sideMenuEmoji}>🍃</Text>, label: '喂食', onPress: () => setActivePanel('feed') },
    { key: 'friends', icon: friendsIconSource ? <Image source={friendsIconSource} style={styles.sideMenuIcon} /> : <Text style={styles.sideMenuEmoji}>👥</Text>, label: '好友', onPress: () => setShowFriendModal(true) },
  ];

  // 右侧菜单项：商店/背包 + 任务
  const rightItems = [
    { key: 'shopInventory', icon: <Image source={require('../assets/images/ui/icons/shop/shop_icon.png')} style={styles.sideMenuIcon} />, label: '商店/背包', onPress: () => setShowShopInventoryModal(true) },
    { key: 'tasks', icon: <Image source={require('../assets/images/ui/icons/system/tasks_icon.png')} style={styles.sideMenuIcon} />, label: '任务', onPress: () => setShowTaskModal(true) },
  ];

  return (
    <Background name={equippedSceneKey}>
      {/* 顶部状态栏 */}
      <View style={styles.topBar}>
        <PetStatusBar pet={pet} onPress={() => setActivePanel('status')} />
        <View style={styles.currencyBar}>
          <View style={styles.currencyItem}>
            <Image source={require('../assets/images/ui/icons/currency/stardust_icon.png')} style={styles.currencyIcon} />
            <Text style={styles.currencyText}>{starDust}</Text>
          </View>
          <View style={styles.currencyItem}>
            <Image source={require('../assets/images/ui/icons/currency/gulucoin_icon.png')} style={styles.currencyIcon} />
            <Text style={styles.currencyText}>{guluCoin}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setActivePanel('settings')}
          activeOpacity={0.7}
        >
          <Image source={require('../assets/images/ui/icons/system/settings_icon.png')} style={styles.settingsButtonIcon} />
        </TouchableOpacity>
      </View>

      {/* 中间区域：侧边菜单 + 宠物 */}
      <View style={styles.centerArea}>
        {/* 左侧菜单 */}
        <Animated.View style={[styles.leftMenu, { opacity: sideOpacity }]}>
          <SideMenu side="left" items={leftItems} persistentCount={2} />
        </Animated.View>

        {/* 宠物 + 气泡 */}
        <View style={styles.petArea}>
          {/* 进化之光按钮 */}
          {evolutionCheck.canEvolve && (
            <Animated.View
              style={[
                styles.evolutionButton,
                { transform: [{ scale: evolutionPulse }], opacity: evolutionPulse.interpolate({
                  inputRange: [1, 1.15],
                  outputRange: [1, 0.85],
                }) },
              ]}
            >
              <TouchableOpacity onPress={handleEvolve} activeOpacity={0.8}>
                <Text style={styles.evolutionText}>✨ 进化之光</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* 浮动气泡：宠物气泡随机环绕，用户气泡在下方，行动闭环在顶部 */}
          <View style={styles.bubbleContainer}>
            {bubblesWithPosition.map(({ bubble, position }, index) => (
              <FloatingBubble
                key={bubble.id}
                data={bubble}
                stackIndex={index}
                paused={false}
                positionOffset={position}
                onDismiss={removeBubble}
              />
            ))}
          </View>

          {/* 宠物形象 */}
          <Animated.View style={{ transform: [{ translateY: petTranslateY }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePetClick}
              onLongPress={handlePetLongPress}
              delayLongPress={500}
            >
              <View style={styles.petWithAccessory}>
                <PetAvatar
                  stage={pet.currentStage}
                  style={pet.style}
                  state={petState}
                  emotion={pet.currentEmotion}
                  size={200}
                  animated
                  grayingSeverity={pet.grayingSeverity}
                  interaction={interactionAnim}
                />
                {equippedAccessorySource && equippedAccessoryKey && (
                  <AccessoryOverlay source={equippedAccessorySource} accessoryKey={equippedAccessoryKey} petSize={200} />
                )}
              </View>
            </TouchableOpacity>
            <PetInteractionWheel
              visible={showInteractionWheel}
              onSelect={handleInteractionSelect}
              onClose={() => setShowInteractionWheel(false)}
            />
          </Animated.View>
        </View>

        {/* 右侧菜单 */}
        <Animated.View style={[styles.rightMenu, { opacity: sideOpacity }]}>
          <SideMenu side="right" items={rightItems} persistentCount={2} />
        </Animated.View>
      </View>

      {/* 对话输入框（展开时） */}
      {isInputExpanded && (
        <Animated.View style={[styles.inputContainer, { opacity: inputOpacity }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.collapseBtn}
              onPress={handleChatToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.collapseBtnText}>↓ 收起</Text>
            </TouchableOpacity>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="对咕噜说点什么..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                maxLength={500}
              />
              <TouchableOpacity style={styles.micBtn}>
                <Text style={styles.micIcon}>🎤</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* 底部导航栏 */}
      {!isInputExpanded && !activeFullScreen && (
        <BottomNavBar
          onChat={handleChatToggle}
          onExplore={handleExplore}
          onProfile={handleProfile}
        />
      )}

      {/* 半屏弹窗：喂食 */}
      <HalfScreenModal
        visible={activePanel === 'feed'}
        onClose={() => setActivePanel(null)}
        title="喂食咕噜"
        heightRatio={0.45}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedList}>
          <FoodCard
            food={basicBiscuit}
            isPreferred={pet?.preferredFoods.includes(basicBiscuit.id)}
            subtitle={`今日剩余 ${Math.max(0, 3 - basicFoodsFedToday)} 份`}
            disabled={basicFoodsFedToday >= 3}
            onPress={() => handleFeedFood(basicBiscuit, 'basic')}
          />
          {FOODS.filter((f) => !f.isBasic).map((food) => {
            const quantity = foodInventoryMap[food.id] ?? 0;
            return (
              <FoodCard
                key={food.id}
                food={food}
                quantity={quantity}
                isPreferred={pet?.preferredFoods.includes(food.id)}
                disabled={quantity <= 0}
                onPress={() => handleFeedFood(food, 'inventory')}
              />
            );
          })}
        </ScrollView>
        <Text style={styles.feedHint}>偏好食物左上角有爱心标识，喂食可额外增加亲密度哦～</Text>
      </HalfScreenModal>

      {/* 半屏弹窗：状态详情 */}
      <HalfScreenModal
        visible={activePanel === 'status'}
        onClose={() => setActivePanel(null)}
        title="咕噜状态"
        heightRatio={0.55}
      >
        <PetDetailPanel pet={pet} onClose={() => setActivePanel(null)} />
      </HalfScreenModal>

      {/* 半屏弹窗：设置 */}
      <HalfScreenModal
        visible={activePanel === 'settings'}
        onClose={() => setActivePanel(null)}
        title="设置"
        heightRatio={0.4}
      >
        <View style={styles.settingsContent}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              setActivePanel(null);
              handleOpenShop();
            }}
          >
            <Text style={styles.settingsBtnText}>🛍️ 进入商店</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              useUserStore.getState().logout();
            }}
          >
            <Text style={styles.logoutBtnText}>退出登录</Text>
          </TouchableOpacity>
        </View>
      </HalfScreenModal>

      {/* 全屏页面覆盖层 */}
      {activeFullScreen && (
        <FullScreenContainer onClose={handleFullScreenClose}>
          {activeFullScreen === 'profile' && <ProfileView onOpenShop={handleOpenShop} />}
        </FullScreenContainer>
      )}

      {/* 进化仪式动画 */}
      {evolutionCeremony && (
        <EvolutionCeremony
          visible={evolutionCeremony.visible}
          fromStage={evolutionCeremony.fromStage}
          toStage={evolutionCeremony.toStage}
          style={pet?.style ?? 'anime'}
          onComplete={handleEvolutionComplete}
        />
      )}

      {/* 好友弹窗 */}
      <HalfScreenModal
        visible={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        title="好友"
        heightRatio={0.6}
      >
        <FriendListModal />
      </HalfScreenModal>

      {/* 任务弹窗 */}
      <HalfScreenModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="任务"
        heightRatio={0.7}
      >
        <TaskModal />
      </HalfScreenModal>

      {/* 商店/背包全屏弹窗 */}
      <FullScreenModal
        visible={showShopInventoryModal}
        onClose={() => setShowShopInventoryModal(false)}
        title="商店 / 背包"
      >
        <ShopInventoryModal
          visible={showShopInventoryModal}
          onClose={() => setShowShopInventoryModal(false)}
        />
      </FullScreenModal>
    </Background>
  );
}

// ========== 子组件 ==========

function FullScreenContainer({ children, onClose }: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(onClose);
  }, [slideAnim, onClose]);

  return (
    <Animated.View
      style={[
        styles.fullScreen,
        { transform: [{ translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 400],
        }) }] },
      ]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={handleClose}>
        <Image source={require('../assets/images/ui/icons/system/back_icon.png')} style={styles.backEmoji} />
      </TouchableOpacity>
      <View style={styles.fullScreenContent}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: theme.spacing.md,
  },
  currencyBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.backgroundSecondary}CC`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currencyIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: theme.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.backgroundTertiary}CC`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } : {}),
  },
  settingsButtonIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  centerArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  leftMenu: {
    position: 'absolute',
    left: theme.spacing.sm,
    top: '30%',
    zIndex: 10,
  },
  rightMenu: {
    position: 'absolute',
    right: theme.spacing.sm,
    top: '30%',
    zIndex: 10,
  },
  petArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petWithAccessory: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessoryOverlay: {
    position: 'absolute',
    top: -20,
    width: 80,
    height: 80,
    zIndex: 5,
  },
  bubbleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  collapseBtn: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  collapseBtnText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
    maxHeight: 100,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 18,
    color: theme.colors.textInverse,
  },

  feedList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  feedHint: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },

  settingsContent: {
    gap: theme.spacing.md,
  },
  settingsBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  settingsBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  backBtn: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backEmoji: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  sideMenuEmoji: {
    fontSize: 26,
  },
  sideMenuIcon: {
    width: 58,
    height: 58,
    resizeMode: 'cover',
  },
  evolutionButton: {
    position: 'absolute',
    top: '15%',
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    shadowColor: theme.colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  evolutionText: {
    color: theme.colors.textInverse,
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
  },
  fullScreenContent: {
    flex: 1,
  },
});


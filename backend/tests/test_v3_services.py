"""
咕噜 Gulu — v3.0 新增服务单元测试
覆盖：
- evolution_service 纯函数（calculate_decay_amount, check_evolution_conditions）
- currency_service（内存模式）
- task_service（任务模板与倍率）
- companion_service 纯函数（calculate_activity_reward, calculate_companion_reward）
- auto_explore_service 纯函数（calculate_auto_explore_cost, generate_whisper_story）
- nickname_service（敏感词审查）
- friend_service（内存模式）
- explore_service（小红书笔记 Mock 数据）
"""

import pytest

from app.services.evolution_service import (
    calculate_decay_amount,
    check_evolution_conditions,
)
from app.services.currency_service import CurrencyService, _mock_currency
from app.services.task_service import (
    TaskService,
    _mock_daily_tasks,
    _mock_weekly_tasks,
    _mock_streaks,
)
from app.services.companion_service import (
    calculate_activity_reward,
    calculate_companion_reward,
)
from app.services.auto_explore_service import (
    calculate_auto_explore_cost,
    generate_whisper_story,
)
from app.services.nickname_service import NicknameService
from app.services.friend_service import (
    FriendService,
    _mock_friends,
    _mock_blocked,
    _mock_reports,
)
from app.services.explore_service import ExploreService
from app.constants.evolution import (
    EVOLUTION_THRESHOLDS,
    INTIMACY_DECAY,
    AUTO_EXPLORE_STAMINA_PER_HOUR,
)
from app.constants.foods import (
    calculate_feed_result,
    get_food_by_id,
    get_preferred_foods,
    DAILY_BASIC_FOOD_LIMIT,
    PREFERENCE_BONUS,
    FOODS,
)
from app.constants.tasks import (
    DAILY_TASK_TEMPLATES,
    WEEKLY_TASK_TEMPLATES,
    TIER_MULTIPLIERS,
    get_tier_multiplier,
    get_weekly_multiplier,
    STREAK_BONUS,
    STREAK_THRESHOLD,
    ALL_COMPLETE_BONUS,
)
from app.constants.nickname_words import check_nickname, check_pet_name


# ========== calculate_decay_amount ==========

class TestCalculateDecayAmount:
    """亲密度衰减计算"""

    def test_no_decay_within_grace(self):
        """0~24h 不衰减"""
        result = calculate_decay_amount(current_intimacy=100, hours_since_interaction=10)
        assert result["decay_amount"] == 0
        assert result["decay_tier"] == "none"
        assert result["new_intimacy"] == 100

    def test_no_decay_at_grace_boundary(self):
        """24h 边界不衰减"""
        result = calculate_decay_amount(current_intimacy=100, hours_since_interaction=24)
        assert result["decay_amount"] == 0
        assert result["decay_tier"] == "none"

    def test_mild_decay_24_to_72h(self):
        """24~72h 温和衰减"""
        # 48h：温和 1 天，每天 -2%
        result = calculate_decay_amount(current_intimacy=100, hours_since_interaction=48)
        assert result["decay_tier"] == "mild"
        # 100 * 0.02 * 1 = 2
        assert result["decay_amount"] == 2.0
        assert result["new_intimacy"] == 98.0

    def test_mild_decay_72h_boundary(self):
        """72h 边界仍为温和"""
        result = calculate_decay_amount(current_intimacy=100, hours_since_interaction=72)
        assert result["decay_tier"] == "mild"
        # 100 * 0.02 * 2 = 4
        assert result["decay_amount"] == 4.0

    def test_accelerated_decay_over_72h(self):
        """72h+ 加速衰减"""
        # 96h：温和 2 天 + 加速 1 天
        # mild_decay = 100 * 0.02 * 2 = 4
        # accel_base = 100 - 4 = 96
        # accel_decay = 96 * 0.05 * 1 = 4.8
        # total = 4 + 4.8 = 8.8
        result = calculate_decay_amount(current_intimacy=100, hours_since_interaction=96)
        assert result["decay_tier"] == "accelerated"
        assert result["decay_amount"] == 8.8
        assert result["new_intimacy"] == 91.2

    def test_decay_never_negative(self):
        """衰减后亲密度不低于 0"""
        result = calculate_decay_amount(current_intimacy=1, hours_since_interaction=500)
        assert result["new_intimacy"] >= 0


# ========== check_evolution_conditions ==========

class TestCheckEvolutionConditions:
    """进化条件检查"""

    def test_max_stage_cannot_evolve(self):
        """3 阶段无法继续进化"""
        result = check_evolution_conditions(
            stage_number=3, intimacy=1000, total_energy=5000, stamina=200, max_stamina=200,
        )
        assert result["can_evolve"] is False

    def test_stage1_all_met(self):
        """1 阶段全部满足可进化"""
        threshold = EVOLUTION_THRESHOLDS[1]
        result = check_evolution_conditions(
            stage_number=1,
            intimacy=threshold["intimacy"],
            total_energy=threshold["energy"],
            stamina=int(threshold["stamina_percent"] * 100),
            max_stamina=100,
        )
        assert result["can_evolve"] is True
        assert result["intimacy_met"] is True
        assert result["energy_met"] is True
        assert result["stamina_met"] is True

    def test_stage1_intimacy_not_met(self):
        """1 阶段亲密度不足"""
        result = check_evolution_conditions(
            stage_number=1,
            intimacy=100,
            total_energy=600,
            stamina=60,
            max_stamina=100,
        )
        assert result["can_evolve"] is False
        assert result["intimacy_met"] is False
        assert result["energy_met"] is True

    def test_stage1_stamina_not_met(self):
        """1 阶段体力百分比不足"""
        result = check_evolution_conditions(
            stage_number=1,
            intimacy=300,
            total_energy=600,
            stamina=40,
            max_stamina=100,
        )
        assert result["can_evolve"] is False
        assert result["stamina_met"] is False

    def test_stage2_thresholds_higher(self):
        """2 阶段阈值更高"""
        result = check_evolution_conditions(
            stage_number=2,
            intimacy=400,
            total_energy=1000,
            stamina=80,
            max_stamina=150,
        )
        assert result["can_evolve"] is False
        # 2 阶段需要 intimacy=500, energy=1500
        assert result["details"]["intimacy"]["required"] == 500
        assert result["details"]["energy"]["required"] == 1500


# ========== CurrencyService（内存模式） ==========

class TestCurrencyService:
    """货币服务（内存降级模式）"""

    def setup_method(self):
        """每个测试前清空内存"""
        _mock_currency.clear()

    @pytest.mark.asyncio
    async def test_get_balance_default_zero(self):
        service = CurrencyService()
        balance = await service.get_balance("user_test_1")
        assert balance["gulu_coin"] == 0
        assert balance["star_dust"] == 0

    @pytest.mark.asyncio
    async def test_add_currency(self):
        service = CurrencyService()
        result = await service.operate_currency(
            user_id="user_test_2",
            currency_type="gulu_coin",
            amount=100,
            operation="add",
            reason="test",
        )
        assert result["gulu_coin"] == 100

    @pytest.mark.asyncio
    async def test_spend_currency_success(self):
        service = CurrencyService()
        await service.operate_currency(
            user_id="user_test_3",
            currency_type="gulu_coin",
            amount=200,
            operation="add",
            reason="test",
        )
        result = await service.operate_currency(
            user_id="user_test_3",
            currency_type="gulu_coin",
            amount=50,
            operation="spend",
            reason="test",
        )
        assert result["gulu_coin"] == 150

    @pytest.mark.asyncio
    async def test_spend_currency_insufficient(self):
        service = CurrencyService()
        with pytest.raises(ValueError, match="余额不足"):
            await service.operate_currency(
                user_id="user_test_4",
                currency_type="gulu_coin",
                amount=100,
                operation="spend",
                reason="test",
            )

    @pytest.mark.asyncio
    async def test_invalid_operation(self):
        service = CurrencyService()
        with pytest.raises(ValueError, match="无效操作"):
            await service.operate_currency(
                user_id="user_test_5",
                currency_type="gulu_coin",
                amount=100,
                operation="transfer",
                reason="test",
            )

    @pytest.mark.asyncio
    async def test_star_dust_independent(self):
        """咕噜币和星尘独立"""
        service = CurrencyService()
        await service.operate_currency(
            user_id="user_test_6",
            currency_type="gulu_coin",
            amount=100,
            operation="add",
            reason="test",
        )
        await service.operate_currency(
            user_id="user_test_6",
            currency_type="star_dust",
            amount=50,
            operation="add",
            reason="test",
        )
        balance = await service.get_balance("user_test_6")
        assert balance["gulu_coin"] == 100
        assert balance["star_dust"] == 50


# ========== TaskService 任务模板与倍率 ==========

class TestTaskConstants:
    """任务常量与倍率函数"""

    def test_daily_task_templates_count(self):
        """每日任务模板应有 5 个"""
        assert len(DAILY_TASK_TEMPLATES) == 5

    def test_weekly_task_templates_count(self):
        """每周任务模板应有 3 个"""
        assert len(WEEKLY_TASK_TEMPLATES) == 3

    def test_tier_multiplier_progressive(self):
        """阶梯奖励递增"""
        assert get_tier_multiplier(1) == 1.0
        assert get_tier_multiplier(3) == 1.2
        assert get_tier_multiplier(5) == 2.0

    def test_tier_multiplier_overflow(self):
        """超出范围返回最大值"""
        assert get_tier_multiplier(10) == 2.0

    def test_weekly_multiplier_full(self):
        """100% 完成率 ×2.0"""
        assert get_weekly_multiplier(1.0) == 2.0

    def test_weekly_multiplier_80_percent(self):
        """≥80% 完成率 ×1.5"""
        assert get_weekly_multiplier(0.8) == 1.5
        assert get_weekly_multiplier(0.85) == 1.5

    def test_weekly_multiplier_50_percent(self):
        """≥50% 完成率 ×1.0"""
        assert get_weekly_multiplier(0.5) == 1.0
        assert get_weekly_multiplier(0.6) == 1.0

    def test_weekly_multiplier_low(self):
        """<50% 完成率 ×0.5"""
        assert get_weekly_multiplier(0.3) == 0.5
        assert get_weekly_multiplier(0.0) == 0.5

    def test_streak_bonus_constants(self):
        """连击加成常量"""
        assert STREAK_THRESHOLD == 3
        assert STREAK_BONUS == 1.5

    def test_all_complete_bonus(self):
        assert ALL_COMPLETE_BONUS == 50


# ========== TaskService 内存模式 ==========

class TestTaskServiceMemory:
    """任务服务内存降级"""

    def setup_method(self):
        _mock_daily_tasks.clear()
        _mock_weekly_tasks.clear()
        _mock_streaks.clear()

    @pytest.mark.asyncio
    async def test_get_daily_tasks_generates(self):
        """首次获取每日任务应生成"""
        service = TaskService()
        result = await service.get_daily_tasks("user_task_1", stage_number=1)
        assert "tasks" in result
        assert len(result["tasks"]) == 5
        assert result["streak_days"] == 0
        assert result["streak_bonus"] == 1.0
        assert "reset_at" in result

    @pytest.mark.asyncio
    async def test_get_weekly_tasks_generates(self):
        """首次获取每周任务应生成"""
        service = TaskService()
        result = await service.get_weekly_tasks("user_task_2")
        assert "tasks" in result
        assert len(result["tasks"]) == 3
        assert result["daily_completion_rate"] == 0
        assert result["star_dust_multiplier"] == 0.5

    @pytest.mark.asyncio
    async def test_update_task_progress(self):
        """更新任务进度"""
        service = TaskService()
        daily = await service.get_daily_tasks("user_task_3", stage_number=1)
        task_id = daily["tasks"][0]["id"]
        updated = await service.update_task_progress(task_id, progress_delta=1)
        assert updated["current_progress"] == 1

    @pytest.mark.asyncio
    async def test_update_task_progress_clamped(self):
        """进度不超过 target"""
        service = TaskService()
        daily = await service.get_daily_tasks("user_task_4", stage_number=1)
        task_id = daily["tasks"][0]["id"]
        target = daily["tasks"][0]["target_progress"]
        updated = await service.update_task_progress(task_id, progress_delta=999)
        assert updated["current_progress"] == target
        assert updated["is_completed"] is True

    @pytest.mark.asyncio
    async def test_claim_uncompleted_task_fails(self):
        """领取未完成任务应失败"""
        service = TaskService()
        daily = await service.get_daily_tasks("user_task_5", stage_number=1)
        task_id = daily["tasks"][0]["id"]
        with pytest.raises(ValueError, match="未完成"):
            await service.claim_task(task_id, "user_task_5")

    @pytest.mark.asyncio
    async def test_claim_completed_task(self):
        """完成并领取任务"""
        service = TaskService()
        daily = await service.get_daily_tasks("user_task_6", stage_number=1)
        task_id = daily["tasks"][0]["id"]
        target = daily["tasks"][0]["target_progress"]
        await service.update_task_progress(task_id, progress_delta=target)
        result = await service.claim_task(task_id, "user_task_6")
        assert result["reward_type"] == "gulu_coin"
        assert result["reward_amount"] > 0


# ========== calculate_activity_reward ==========

class TestCalculateActivityReward:
    """散步/运动奖励计算"""

    def test_walk_basic(self):
        result = calculate_activity_reward("walk", duration_minutes=30)
        assert result["stamina_cost"] >= 10
        assert result["energy_gained"] >= 15
        assert result["intimacy_gained"] >= 5

    def test_run_higher_than_walk(self):
        """运动消耗高于散步"""
        walk = calculate_activity_reward("walk", 30)
        run = calculate_activity_reward("run", 30)
        assert run["stamina_cost"] > walk["stamina_cost"]
        assert run["energy_gained"] > walk["energy_gained"]

    def test_invalid_activity_type(self):
        with pytest.raises(ValueError, match="无效的活动类型"):
            calculate_activity_reward("swim", 30)

    def test_long_duration_capped(self):
        """长时长被截断"""
        short = calculate_activity_reward("walk", 30)
        long = calculate_activity_reward("walk", 300)
        # 时长比例被 min(1.5, ...) 限制
        assert long["stamina_cost"] >= short["stamina_cost"]


# ========== calculate_companion_reward ==========

class TestCalculateCompanionReward:
    """室内陪伴活动奖励计算"""

    def test_meditation_basic(self):
        result = calculate_companion_reward("meditation", duration_minutes=5)
        assert result["stamina_cost"] == 0
        assert result["energy_gained"] >= 5
        assert result["intimacy_gained"] == 5

    def test_pomodoro_fixed_energy(self):
        """番茄学习能量固定"""
        result = calculate_companion_reward("pomodoro", duration_minutes=25)
        assert result["energy_gained"] == 10
        assert result["intimacy_gained"] == 15

    def test_journal_basic(self):
        result = calculate_companion_reward("journal", duration_minutes=10)
        assert result["stamina_cost"] == 0
        assert result["energy_gained"] == 5
        assert result["intimacy_gained"] == 10

    def test_invalid_companion_type(self):
        with pytest.raises(ValueError, match="无效的陪伴活动类型"):
            calculate_companion_reward("cooking", 10)

    def test_companion_no_stamina_cost(self):
        """所有陪伴活动不消耗体力"""
        for activity in ["meditation", "pomodoro", "journal", "music"]:
            result = calculate_companion_reward(activity, 15)
            assert result["stamina_cost"] == 0


# ========== calculate_auto_explore_cost ==========

class TestCalculateAutoExploreCost:
    """自主探索体力消耗计算"""

    def test_stage1_cost(self):
        """萌芽体每小时 5"""
        assert calculate_auto_explore_cost(stage_number=1, duration_hours=2) == 10

    def test_stage2_cost(self):
        """成长体每小时 8"""
        assert calculate_auto_explore_cost(stage_number=2, duration_hours=2) == 16

    def test_stage3_cost(self):
        """灵魂体每小时 12"""
        assert calculate_auto_explore_cost(stage_number=3, duration_hours=2) == 24

    def test_cost_scales_with_duration(self):
        """消耗随时长线性增长"""
        cost_1h = calculate_auto_explore_cost(stage_number=1, duration_hours=1)
        cost_4h = calculate_auto_explore_cost(stage_number=1, duration_hours=4)
        assert cost_4h == 4 * cost_1h

    def test_cost_scales_with_stage(self):
        """高阶段消耗更高"""
        c1 = calculate_auto_explore_cost(stage_number=1, duration_hours=4)
        c2 = calculate_auto_explore_cost(stage_number=2, duration_hours=4)
        c3 = calculate_auto_explore_cost(stage_number=3, duration_hours=4)
        assert c1 < c2 < c3


# ========== generate_whisper_story ==========

class TestGenerateWhisperStory:
    """悄悄话生成"""

    def test_extrovert_returns_social(self):
        """外向型返回 social"""
        for personality in ["spark", "performer", "adventurer", "debater", "commander"]:
            result = generate_whisper_story(personality)
            assert result["personality_tag"] == "social"
            assert len(result["story"]) > 0

    def test_introvert_returns_solo(self):
        """内向型返回 solo"""
        for personality in ["dreamer", "mystic", "thinker", "artist", "guardian"]:
            result = generate_whisper_story(personality)
            assert result["personality_tag"] == "solo"
            assert len(result["story"]) > 0

    def test_unknown_personality_defaults_solo(self):
        """未知性格默认独白型"""
        result = generate_whisper_story("unknown_type")
        assert result["personality_tag"] == "solo"


# ========== NicknameService ==========

class TestNicknameService:
    """昵称审查服务"""

    def setup_method(self):
        self.service = NicknameService()

    def test_valid_nickname(self):
        result = self.service.check("小明")
        assert result["is_valid"] is True

    def test_empty_nickname(self):
        result = self.service.check("")
        assert result["is_valid"] is False
        assert "空" in result["reason"]

    def test_too_long_nickname(self):
        result = self.service.check("超长昵称超长昵称超长昵称X")
        assert result["is_valid"] is False
        assert "超过" in result["reason"]

    def test_ad_word_nickname(self):
        result = self.service.check("加微信好友")
        assert result["is_valid"] is False
        assert "广告" in result["reason"]

    def test_violation_word_nickname(self):
        result = self.service.check("赌博大王")
        assert result["is_valid"] is False
        assert "违规" in result["reason"]

    def test_insult_word_nickname(self):
        result = self.service.check("傻逼啊")
        assert result["is_valid"] is False
        assert "不当" in result["reason"]

    def test_valid_pet_name(self):
        result = self.service.check_pet_name("咕噜")
        assert result["is_valid"] is True

    def test_pet_name_too_long(self):
        result = self.service.check_pet_name("超长宠物名超长宠物名")
        assert result["is_valid"] is False
        assert "超过" in result["reason"]

    def test_pet_name_with_ad_word(self):
        result = self.service.check_pet_name("加微信")
        assert result["is_valid"] is False


# ========== check_nickname / check_pet_name 纯函数 ==========

class TestNicknamePureFunctions:
    """昵称审查纯函数"""

    def test_check_nickname_valid(self):
        result = check_nickname("咕噜主人")
        assert result["is_valid"] is True

    def test_check_nickname_with_url(self):
        result = check_nickname("www.test.com")
        assert result["is_valid"] is False

    def test_check_pet_name_valid(self):
        result = check_pet_name("小咕噜")
        assert result["is_valid"] is True

    def test_check_pet_name_empty(self):
        result = check_pet_name("")
        assert result["is_valid"] is False


# ========== FriendService 内存模式 ==========

class TestFriendServiceMemory:
    """好友服务内存降级"""

    def setup_method(self):
        _mock_friends.clear()
        _mock_blocked.clear()
        _mock_reports.clear()

    @pytest.mark.asyncio
    async def test_get_friends_default_pool(self):
        """未配置时返回 Mock 好友池"""
        service = FriendService()
        result = await service.get_friends("user_friend_1")
        assert "friends" in result
        assert len(result["friends"]) >= 1

    @pytest.mark.asyncio
    async def test_add_friend_success(self):
        service = FriendService()
        result = await service.add_friend("user_friend_2", "target_1")
        assert result["message"] == "添加成功"

    @pytest.mark.asyncio
    async def test_add_self_fails(self):
        service = FriendService()
        with pytest.raises(ValueError, match="不能添加自己"):
            await service.add_friend("user_friend_3", "user_friend_3")

    @pytest.mark.asyncio
    async def test_add_blocked_fails(self):
        service = FriendService()
        await service.block_user("user_friend_4", "target_blocked")
        with pytest.raises(ValueError, match="已被你拉黑"):
            await service.add_friend("user_friend_4", "target_blocked")

    @pytest.mark.asyncio
    async def test_block_user_success(self):
        service = FriendService()
        result = await service.block_user("user_friend_5", "target_2")
        assert result["message"] == "已拉黑"
        blocked = await service.get_blocked_list("user_friend_5")
        assert "target_2" in blocked

    @pytest.mark.asyncio
    async def test_block_self_fails(self):
        service = FriendService()
        with pytest.raises(ValueError, match="不能拉黑自己"):
            await service.block_user("user_friend_6", "user_friend_6")

    @pytest.mark.asyncio
    async def test_report_user_success(self):
        service = FriendService()
        result = await service.report_user(
            reporter_id="user_friend_7",
            target_id="target_3",
            reason="骚扰",
            description="频繁发送不当内容",
        )
        assert "举报已提交" in result["message"]
        assert len(_mock_reports) == 1

    @pytest.mark.asyncio
    async def test_get_explore_privacy_default(self):
        """默认隐私设置全为 False"""
        service = FriendService()
        result = await service.get_explore_privacy("user_friend_8")
        assert result["show_gender"] is False
        assert result["show_mbti"] is False
        assert result["show_zodiac"] is False
        assert result["first_visit_done"] is False

    @pytest.mark.asyncio
    async def test_update_explore_privacy(self):
        service = FriendService()
        result = await service.update_explore_privacy(
            "user_friend_9",
            show_gender=True,
            show_mbti=True,
            show_zodiac=False,
        )
        assert result["show_gender"] is True
        assert result["show_mbti"] is True
        assert result["show_zodiac"] is False
        assert result["first_visit_done"] is True


# ========== ExploreService 小红书笔记 Mock ==========

class TestExploreServiceXiaohongshu:
    """探索服务小红书笔记 Mock 数据"""

    def test_build_mock_xiaohongshu_notes(self):
        service = ExploreService()
        notes = service._build_mock_xiaohongshu_notes(lat=31.2304, lng=121.4737, limit=20)
        assert len(notes) > 0
        for note in notes:
            assert "id" in note
            assert "title" in note
            assert "cover_url" in note
            assert "lat" in note
            assert "lng" in note
            assert "distance" in note
            assert "tags" in note
            assert isinstance(note["tags"], list)

    def test_notes_sorted_by_distance(self):
        """笔记按距离升序"""
        service = ExploreService()
        notes = service._build_mock_xiaohongshu_notes(lat=31.2304, lng=121.4737, limit=20)
        distances = [n["distance"] for n in notes]
        assert distances == sorted(distances)

    def test_notes_location_blurred(self):
        """位置模糊化为 3 位小数"""
        service = ExploreService()
        notes = service._build_mock_xiaohongshu_notes(lat=31.2304567, lng=121.4737890, limit=5)
        for note in notes:
            if note["lat"] is not None:
                # 检查小数位数不超过 3
                assert round(note["lat"], 3) == note["lat"]
            if note["lng"] is not None:
                assert round(note["lng"], 3) == note["lng"]

    def test_notes_limit(self):
        """limit 截断"""
        service = ExploreService()
        notes = service._build_mock_xiaohongshu_notes(lat=31.0, lng=121.0, limit=3)
        assert len(notes) <= 3


# ========== 食物系统纯函数 ==========

class TestFoodSystem:
    """食物数据与偏好系统"""

    def test_get_food_by_id_exists(self):
        food = get_food_by_id("food_basic")
        assert food is not None
        assert food["name"] == "基础咕噜粮"
        assert food["is_basic"] is True

    def test_get_food_by_id_not_exists(self):
        assert get_food_by_id("nonexistent") is None

    def test_calculate_feed_result_not_preferred(self):
        food = get_food_by_id("food_sun_grass")
        result = calculate_feed_result(food, is_preferred=False)
        assert result["stamina_gained"] == food["stamina"]
        assert result["intimacy_gained"] == food["intimacy"]
        assert result["preference_bonus"] is None

    def test_calculate_feed_result_preferred_common(self):
        """偏好普通食物 +30%"""
        food = get_food_by_id("food_sun_grass")
        result = calculate_feed_result(food, is_preferred=True)
        assert result["is_preferred"] is True
        assert result["preference_bonus"] == "+30%"
        expected = int(food["intimacy"] * 1.3)
        assert result["intimacy_gained"] == expected

    def test_calculate_feed_result_preferred_fine(self):
        """偏好优良食物 +40%"""
        food = get_food_by_id("food_soul_berry")
        result = calculate_feed_result(food, is_preferred=True)
        assert result["preference_bonus"] == "+40%"

    def test_calculate_feed_result_preferred_rare(self):
        """偏好稀有食物 +50%"""
        food = get_food_by_id("food_dream_fish")
        result = calculate_feed_result(food, is_preferred=True)
        assert result["preference_bonus"] == "+50%"

    def test_get_preferred_foods_known(self):
        """已知性格返回偏好列表"""
        foods = get_preferred_foods("dreamer")
        assert len(foods) == 3
        assert "food_soul_berry" in foods

    def test_get_preferred_foods_unknown(self):
        """未知性格返回空列表"""
        foods = get_preferred_foods("unknown")
        assert foods == []

    def test_daily_basic_food_limit(self):
        assert DAILY_BASIC_FOOD_LIMIT == 3

    def test_all_foods_have_required_fields(self):
        """所有食物数据完整"""
        for food in FOODS:
            assert "id" in food
            assert "name" in food
            assert "quality" in food
            assert "stamina" in food
            assert "intimacy" in food
            assert "price" in food
            assert "is_basic" in food

    def test_basic_food_free(self):
        """基础食物免费"""
        food = get_food_by_id("food_basic")
        assert food["price"] == 0

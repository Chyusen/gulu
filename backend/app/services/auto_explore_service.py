"""
咕噜 Gulu — 宠物自主探索服务
对应需求文档 4.6 宠物自主探索 / 4.7 咕噜悄悄话
实现 API 13
"""

import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.database import get_supabase, is_supabase_available
from app.constants.evolution import (
    AUTO_EXPLORE_STAMINA_PER_HOUR,
    AUTO_EXPLORE_DURATIONS,
    STAMINA_THRESHOLD,
)
from app.constants.companion import (
    WHISPER_TEMPLATES_SOCIAL,
    WHISPER_TEMPLATES_SOLO,
)
from app.services.evolution_service import EvolutionService
from app.services.currency_service import CurrencyService
from app.services.task_service import TaskService

logger = logging.getLogger(__name__)

# demo 模式内存存储
_mock_auto_explores: dict = {}  # {pet_id: {started_at, duration_hours, estimated_stamina_cost}}
_mock_whispers: dict = {}  # {pet_id: [whisper_dict, ...]}

# 自主探索可发现的道具
AUTO_EXPLORE_ITEMS = [
    "crystal_shard", "star_fragment", "dream_feather",
    "moon_petals", "sun_stone", "rainbow_dust",
]


class AutoExploreService:
    """宠物自主探索服务"""

    # ========== API 13：开始自主探索 ==========

    async def start_auto_explore(
        self,
        pet_id: str,
        duration_hours: int,
        user_id: str,
    ) -> dict:
        """
        开始宠物自主探索。
        - 检查时长是否合法
        - 检查体力是否充足
        - 记录探索状态
        """
        if duration_hours not in AUTO_EXPLORE_DURATIONS:
            raise ValueError(f"探索时长必须为 {AUTO_EXPLORE_DURATIONS} 之一")

        evolution_service = EvolutionService()
        pet = await evolution_service._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        # 检查是否已在探索中
        existing = await self._get_active_explore(pet_id)
        if existing:
            raise ValueError("宠物正在探索中，请等待归来")

        # 检查体力阈值
        stamina = pet.get("stamina", 0)
        max_stamina = pet.get("max_stamina", 100)
        stamina_percent = stamina / max_stamina if max_stamina > 0 else 0

        if stamina_percent < STAMINA_THRESHOLD["explore_min_percent"]:
            raise ValueError("体力不足，无法出发探索")

        # 计算预计体力消耗
        stage = pet.get("stage_number", 1)
        cost_per_hour = AUTO_EXPLORE_STAMINA_PER_HOUR.get(stage, 5)
        estimated_cost = cost_per_hour * duration_hours

        if stamina < estimated_cost:
            raise ValueError(f"体力不足以完成探索（需要 {estimated_cost}，当前 {stamina}）")

        # 记录探索
        started_at = datetime.now(timezone.utc)
        will_return_at = started_at + timedelta(hours=duration_hours)

        explore_data = {
            "id": str(uuid.uuid4()),
            "pet_id": pet_id,
            "user_id": user_id,
            "started_at": started_at.isoformat(),
            "duration_hours": duration_hours,
            "estimated_stamina_cost": estimated_cost,
            "is_completed": False,
        }

        await self._save_explore(explore_data)

        return {
            "estimated_stamina_cost": estimated_cost,
            "started_at": started_at.isoformat(),
            "will_return_at": will_return_at.isoformat(),
        }

    # ========== API 13：完成自主探索 ==========

    async def complete_auto_explore(self, pet_id: str, user_id: str) -> dict:
        """
        完成宠物自主探索。
        - 检查探索是否已完成（时间到）
        - 扣除体力
        - 发放奖励（咕噜币、能量、随机道具）
        - 生成咕噜悄悄话
        """
        explore = await self._get_active_explore(pet_id)
        if not explore:
            raise ValueError("宠物没有进行中的探索")

        started_at = datetime.fromisoformat(explore["started_at"].replace("Z", "+00:00"))
        duration_hours = explore["duration_hours"]
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds() / 3600

        if elapsed < duration_hours:
            raise ValueError(f"探索尚未完成（已 {elapsed:.1f}h / 需 {duration_hours}h）")

        # 扣除体力
        stamina_cost = explore["estimated_stamina_cost"]
        evolution_service = EvolutionService()
        await evolution_service.update_stats(
            pet_id,
            stamina_delta=-stamina_cost,
            reason="auto_explore",
        )

        # 计算奖励
        energy_gained = int(20 + duration_hours * 5)  # 20~60
        gulu_coin_gained = int(15 + duration_hours * 5)  # 15~55
        items_found = random.sample(AUTO_EXPLORE_ITEMS, min(2, len(AUTO_EXPLORE_ITEMS)))

        # 增加能量
        await evolution_service.update_stats(
            pet_id,
            energy_delta=energy_gained,
            reason="auto_explore",
        )

        # 发放咕噜币
        currency_service = CurrencyService()
        await currency_service.operate_currency(
            user_id=user_id,
            currency_type="gulu_coin",
            amount=gulu_coin_gained,
            operation="add",
            reason="explore",
        )

        # 生成悄悄话
        whisper = await self._generate_whisper(pet_id)

        # 标记探索完成
        await self._mark_explore_completed(explore["id"])

        # 更新任务进度
        task_service = TaskService()
        await task_service.update_progress_by_type(user_id, "explore", 1)

        return {
            "stamina_cost": stamina_cost,
            "energy_gained": energy_gained,
            "gulu_coin_gained": gulu_coin_gained,
            "items_found": items_found,
            "whisper": whisper,
        }

    # ========== 检查自主探索是否完成 ==========

    async def check_auto_explore_complete(self, pet_id: str) -> Optional[dict]:
        """检查自主探索是否已完成（不执行完成操作）"""
        explore = await self._get_active_explore(pet_id)
        if not explore:
            return None

        started_at = datetime.fromisoformat(explore["started_at"].replace("Z", "+00:00"))
        duration_hours = explore["duration_hours"]
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds() / 3600

        if elapsed >= duration_hours:
            return explore
        return None

    # ========== 获取悄悄话列表 ==========

    async def get_whispers(self, pet_id: str) -> list:
        """获取宠物的悄悄话列表"""
        if not is_supabase_available():
            return _mock_whispers.get(pet_id, [])

        try:
            supabase = get_supabase()
            result = (
                supabase.table("gulu_whispers")
                .select("*")
                .eq("pet_id", pet_id)
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.warning(f"获取悄悄话失败: {e}")
            return _mock_whispers.get(pet_id, [])

    # ========== 内部方法 ==========

    async def _generate_whisper(self, pet_id: str) -> dict:
        """生成咕噜悄悄话"""
        evolution_service = EvolutionService()
        pet = await evolution_service._get_pet(pet_id)
        personality_type = pet.get("personality_type", "dreamer") if pet else "dreamer"

        # 根据性格判断外向/内向
        extrovert_types = {"spark", "performer", "adventurer", "debater", "commander", "guide", "host"}
        is_extrovert = personality_type in extrovert_types

        if is_extrovert:
            story = random.choice(WHISPER_TEMPLATES_SOCIAL)
            tag = "social"
        else:
            story = random.choice(WHISPER_TEMPLATES_SOLO)
            tag = "solo"

        whisper = {
            "id": str(uuid.uuid4()),
            "pet_id": pet_id,
            "story": story,
            "personality_tag": tag,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # 保存
        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("gulu_whispers").insert(whisper).execute()
            except Exception as e:
                logger.warning(f"保存悄悄话失败: {e}")
                _mock_whispers.setdefault(pet_id, []).append(whisper)
        else:
            _mock_whispers.setdefault(pet_id, []).append(whisper)

        return whisper

    async def _get_active_explore(self, pet_id: str) -> Optional[dict]:
        """获取进行中的自主探索"""
        if not is_supabase_available():
            return _mock_auto_explores.get(pet_id)

        try:
            supabase = get_supabase()
            result = (
                supabase.table("auto_explores")
                .select("*")
                .eq("pet_id", pet_id)
                .eq("is_completed", False)
                .order("started_at", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning(f"获取自主探索失败: {e}")
            return _mock_auto_explores.get(pet_id)
        return None

    async def _save_explore(self, data: dict) -> None:
        """保存探索记录"""
        if not is_supabase_available():
            _mock_auto_explores[data["pet_id"]] = data
            return

        try:
            supabase = get_supabase()
            supabase.table("auto_explores").insert(data).execute()
        except Exception as e:
            logger.warning(f"保存探索记录失败: {e}")
            _mock_auto_explores[data["pet_id"]] = data

    async def _mark_explore_completed(self, explore_id: str) -> None:
        """标记探索完成"""
        if not is_supabase_available():
            for pet_id, explore in _mock_auto_explores.items():
                if explore.get("id") == explore_id:
                    explore["is_completed"] = True
                    del _mock_auto_explores[pet_id]
                    return
            return

        try:
            supabase = get_supabase()
            supabase.table("auto_explores").update({"is_completed": True}).eq("id", explore_id).execute()
        except Exception as e:
            logger.warning(f"标记探索完成失败: {e}")


# ========== 纯函数（供单元测试） ==========

def calculate_auto_explore_cost(stage_number: int, duration_hours: int) -> int:
    """
    纯函数：计算自主探索体力消耗。
    供单元测试直接调用。
    """
    cost_per_hour = AUTO_EXPLORE_STAMINA_PER_HOUR.get(stage_number, 5)
    return cost_per_hour * duration_hours


def generate_whisper_story(personality_type: str) -> dict:
    """
    纯函数：根据性格生成悄悄话。
    供单元测试直接调用。
    """
    extrovert_types = {"spark", "performer", "adventurer", "debater", "commander", "guide", "host"}
    is_extrovert = personality_type in extrovert_types

    if is_extrovert:
        return {
            "story": random.choice(WHISPER_TEMPLATES_SOCIAL),
            "personality_tag": "social",
        }
    return {
        "story": random.choice(WHISPER_TEMPLATES_SOLO),
        "personality_tag": "solo",
    }

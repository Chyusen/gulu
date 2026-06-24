"""
咕噜 Gulu — 探索活动服务
对应需求文档 四、探索界面重构
实现 API 11/12（散步/运动/室内陪伴活动）
"""

import random
import logging
from typing import Optional
from app.core.database import is_supabase_available
from app.constants.companion import (
    COMPANION_ACTIVITIES, ACTIVITY_CONFIG, ACTIVITY_COMMENTS,
)
from app.constants.evolution import STAMINA_THRESHOLD
from app.services.evolution_service import EvolutionService
from app.services.currency_service import CurrencyService
from app.services.task_service import TaskService

logger = logging.getLogger(__name__)


class CompanionService:
    """散步/运动/室内陪伴活动服务"""

    async def execute_activity(
        self,
        user_id: str,
        pet_id: str,
        activity_type: str,
        duration_minutes: int,
        distance_meters: int = 0,
    ) -> dict:
        """
        执行散步/运动/Citywalk。
        - 检查体力是否充足
        - 计算体力消耗、能量增长、亲密度增长
        - 更新宠物数值
        - 发放咕噜币奖励
        - 更新任务进度
        """
        config = ACTIVITY_CONFIG.get(activity_type)
        if not config:
            raise ValueError(f"无效的活动类型: {activity_type}")

        evolution_service = EvolutionService()
        pet = await evolution_service._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        # 检查体力阈值
        stamina = pet.get("stamina", 0)
        max_stamina = pet.get("max_stamina", 100)
        stamina_percent = stamina / max_stamina if max_stamina > 0 else 0

        if stamina_percent < STAMINA_THRESHOLD["explore_min_percent"]:
            raise ValueError("体力不足，无法发起探索")

        # 按时长比例计算消耗与奖励
        time_ratio = min(1.5, max(0.5, duration_minutes / 30))  # 以 30 分钟为基准

        stamina_cost = int(config["stamina_min"] + (
            config["stamina_max"] - config["stamina_min"]
        ) * min(1.0, time_ratio))

        energy_gained = int(config["energy_min"] + (
            config["energy_max"] - config["energy_min"]
        ) * min(1.0, time_ratio))

        intimacy_gained = int(config["intimacy_min"] + (
            config["intimacy_max"] - config["intimacy_min"]
        ) * min(1.0, time_ratio))

        gulu_coin_gained = random.randint(
            config["gulu_coin_min"], config["gulu_coin_max"]
        )

        # 更新宠物数值（消耗体力，增加能量和亲密度）
        await evolution_service.update_stats(
            pet_id,
            stamina_delta=-stamina_cost,
            intimacy_delta=intimacy_gained,
            energy_delta=energy_gained,
            reason="explore",
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

        # 更新任务进度
        task_service = TaskService()
        await task_service.update_progress_by_type(user_id, "explore", 1)

        # 生成咕噜评语
        comments = ACTIVITY_COMMENTS.get(activity_type, ACTIVITY_COMMENTS["walk"])
        gulu_comment = random.choice(comments)

        return {
            "stamina_cost": stamina_cost,
            "energy_gained": energy_gained,
            "intimacy_gained": intimacy_gained,
            "gulu_coin_gained": gulu_coin_gained,
            "gulu_comment": gulu_comment,
        }

    async def execute_companion(
        self,
        user_id: str,
        pet_id: str,
        activity_type: str,
        duration_minutes: int,
    ) -> dict:
        """
        执行室内陪伴活动。
        - 不消耗体力
        - 增加能量和亲密度
        - 更新任务进度
        """
        config = COMPANION_ACTIVITIES.get(activity_type)
        if not config:
            raise ValueError(f"无效的陪伴活动类型: {activity_type}")

        # 验证时长
        if duration_minutes < config["min_minutes"] or duration_minutes > config["max_minutes"]:
            raise ValueError(
                f"{config['name']}时长应在 {config['min_minutes']}~{config['max_minutes']} 分钟"
            )

        evolution_service = EvolutionService()
        pet = await evolution_service._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        # 计算能量增长（按时长比例）
        if config["energy_min"] == config["energy_max"]:
            energy_gained = config["energy_min"]
        else:
            ratio = (duration_minutes - config["min_minutes"]) / max(1, config["max_minutes"] - config["min_minutes"])
            energy_gained = int(config["energy_min"] + (config["energy_max"] - config["energy_min"]) * ratio)

        intimacy_gained = config["intimacy"]

        # 更新宠物数值（不消耗体力，增加能量和亲密度）
        await evolution_service.update_stats(
            pet_id,
            intimacy_delta=intimacy_gained,
            energy_delta=energy_gained,
            reason="companion",
        )

        # 更新任务进度
        task_service = TaskService()
        await task_service.update_progress_by_type(user_id, "companion", 1)

        # 生成咕噜评语
        comments = ACTIVITY_COMMENTS.get(activity_type, ACTIVITY_COMMENTS["meditation"])
        gulu_comment = random.choice(comments)

        return {
            "energy_gained": energy_gained,
            "intimacy_gained": intimacy_gained,
            "stamina_cost": 0,
            "gulu_comment": gulu_comment,
        }


# ========== 纯函数（供单元测试） ==========

def calculate_activity_reward(
    activity_type: str,
    duration_minutes: int,
) -> dict:
    """
    纯函数：计算散步/运动/Citywalk 奖励。
    供单元测试直接调用。
    """
    config = ACTIVITY_CONFIG.get(activity_type)
    if not config:
        raise ValueError(f"无效的活动类型: {activity_type}")

    time_ratio = min(1.5, max(0.5, duration_minutes / 30))
    stamina_cost = int(config["stamina_min"] + (
        config["stamina_max"] - config["stamina_min"]
    ) * min(1.0, time_ratio))
    energy_gained = int(config["energy_min"] + (
        config["energy_max"] - config["energy_min"]
    ) * min(1.0, time_ratio))
    intimacy_gained = int(config["intimacy_min"] + (
        config["intimacy_max"] - config["intimacy_min"]
    ) * min(1.0, time_ratio))

    return {
        "stamina_cost": stamina_cost,
        "energy_gained": energy_gained,
        "intimacy_gained": intimacy_gained,
    }


def calculate_companion_reward(
    activity_type: str,
    duration_minutes: int,
) -> dict:
    """
    纯函数：计算室内陪伴活动奖励。
    供单元测试直接调用。
    """
    config = COMPANION_ACTIVITIES.get(activity_type)
    if not config:
        raise ValueError(f"无效的陪伴活动类型: {activity_type}")

    if config["energy_min"] == config["energy_max"]:
        energy = config["energy_min"]
    else:
        ratio = (duration_minutes - config["min_minutes"]) / max(1, config["max_minutes"] - config["min_minutes"])
        energy = int(config["energy_min"] + (config["energy_max"] - config["energy_min"]) * ratio)

    return {
        "energy_gained": energy,
        "intimacy_gained": config["intimacy"],
        "stamina_cost": 0,
    }

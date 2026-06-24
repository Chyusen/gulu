"""
咕噜 Gulu — 进化服务
对应需求文档 二、宠物进化体系
实现 API 2/3/4/5/6
"""

import json
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.database import get_supabase, is_supabase_available
from app.constants.evolution import (
    STAGE_NAMES, STAGE_INT_TO_STR, STAGE_LIMITS,
    EVOLUTION_THRESHOLDS, INTIMACY_DECAY, STAMINA_THRESHOLD,
    EVOLUTION_UNLOCKS,
)
from app.constants.foods import (
    get_food_by_id, get_preferred_foods, calculate_feed_result,
    DAILY_BASIC_FOOD_LIMIT,
)

logger = logging.getLogger(__name__)

# demo 模式内存存储
_mock_pets_v3: dict = {}
_mock_feed_usage: dict = {}  # {(user_id, pet_id, date_str): count}


class EvolutionService:
    """宠物进化与数值管理服务"""

    # ========== API 2：进化判定 ==========

    async def check_evolution(self, pet_id: str) -> dict:
        """
        检查宠物是否可以进化。
        返回 can_evolve, to_stage, current_stage, requirements。
        """
        pet = await self._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        stage_number = pet.get("stage_number", 1)

        # 已是最高阶段
        if stage_number >= 3:
            return {
                "can_evolve": False,
                "to_stage": 3,
                "current_stage": stage_number,
                "requirements": {},
            }

        threshold = EVOLUTION_THRESHOLDS[stage_number]
        max_stamina = pet.get("max_stamina", STAGE_LIMITS[stage_number]["stamina"])
        stamina_percent = pet.get("stamina", 0) / max_stamina if max_stamina > 0 else 0

        intimacy_met = pet.get("intimacy", 0) >= threshold["intimacy"]
        energy_met = pet.get("total_energy", 0) >= threshold["energy"]
        stamina_met = stamina_percent >= threshold["stamina_percent"]

        return {
            "can_evolve": intimacy_met and energy_met and stamina_met,
            "to_stage": stage_number + 1,
            "current_stage": stage_number,
            "requirements": {
                "intimacy": {
                    "current": pet.get("intimacy", 0),
                    "required": threshold["intimacy"],
                    "met": intimacy_met,
                },
                "energy": {
                    "current": pet.get("total_energy", 0),
                    "required": threshold["energy"],
                    "met": energy_met,
                },
                "stamina_percent": {
                    "current": round(stamina_percent, 2),
                    "required": threshold["stamina_percent"],
                    "met": stamina_met,
                },
            },
        }

    # ========== API 3：执行进化 ==========

    async def evolve(self, pet_id: str) -> dict:
        """
        执行宠物进化。
        条件不满足时抛出 ValueError。
        """
        check_result = await self.check_evolution(pet_id)
        if not check_result["can_evolve"]:
            failed = []
            for key, val in check_result["requirements"].items():
                if not val["met"]:
                    failed.append(f"{key} 未达标（当前 {val['current']}，需要 {val['required']}）")
            raise ValueError("进化条件未满足：" + "；".join(failed))

        pet = await self._get_pet(pet_id)
        previous_stage = pet.get("stage_number", 1)
        new_stage = previous_stage + 1
        new_limits = STAGE_LIMITS[new_stage]
        unlock = EVOLUTION_UNLOCKS.get(previous_stage, {})

        # 更新宠物
        update_data = {
            "stage_number": new_stage,
            "current_stage": STAGE_INT_TO_STR[new_stage],
            "max_stamina": new_limits["stamina"],
            "max_intimacy": new_limits["intimacy"],
            "max_total_energy": new_limits["energy"],
            "last_interaction_at": datetime.now(timezone.utc).isoformat(),
        }
        await self._update_pet(pet_id, update_data)

        unlocked_list = [
            unlock.get("interactions", ""),
            unlock.get("dialogue", ""),
            f"探索范围{unlock.get('explore_range', '')}",
        ]

        return {
            "pet_id": pet_id,
            "previous_stage": previous_stage,
            "current_stage": new_stage,
            "unlocked": unlocked_list,
            "new_limits": {
                "stamina": new_limits["stamina"],
                "intimacy": new_limits["intimacy"],
                "energy": new_limits["energy"],
            },
        }

    # ========== API 4：宠物数值更新 ==========

    async def update_stats(
        self,
        pet_id: str,
        stamina_delta: int = 0,
        intimacy_delta: int = 0,
        energy_delta: int = 0,
        reason: str = "interact",
    ) -> dict:
        """
        更新宠物三维数值。
        各数值增减后 clamp 到 [0, max]。
        reason=decay 时只减少亲密度。
        非衰减操作时更新 last_interaction_at。
        """
        pet = await self._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        stage = pet.get("stage_number", 1)
        max_stamina = pet.get("max_stamina", STAGE_LIMITS[stage]["stamina"])
        max_intimacy = pet.get("max_intimacy", STAGE_LIMITS[stage]["intimacy"])
        max_energy = pet.get("max_total_energy", STAGE_LIMITS[stage]["energy"])

        new_stamina = pet.get("stamina", 0)
        new_intimacy = pet.get("intimacy", 0)
        new_energy = pet.get("total_energy", 0)

        if reason != "decay":
            new_stamina = max(0, min(max_stamina, new_stamina + stamina_delta))
            new_intimacy = max(0, min(max_intimacy, new_intimacy + intimacy_delta))
            new_energy = max(0, min(max_energy, new_energy + energy_delta))
        else:
            # 衰减只减亲密度
            new_intimacy = max(0, new_intimacy - intimacy_delta)

        update_data = {
            "stamina": new_stamina,
            "intimacy": new_intimacy,
            "total_energy": new_energy,
        }

        if reason != "decay":
            update_data["last_interaction_at"] = datetime.now(timezone.utc).isoformat()

        await self._update_pet(pet_id, update_data)

        return {
            "stamina": new_stamina,
            "max_stamina": max_stamina,
            "intimacy": new_intimacy,
            "max_intimacy": max_intimacy,
            "total_energy": new_energy,
            "max_total_energy": max_energy,
        }

    # ========== API 5：亲密度衰减计算 ==========

    async def calculate_intimacy_decay(self, pet_id: str) -> dict:
        """
        计算亲密度衰减。
        不实际执行衰减，只返回计算结果。
        """
        pet = await self._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        last_interaction = pet.get("last_interaction_at")
        current_intimacy = pet.get("intimacy", 0)

        if not last_interaction:
            return {
                "current_intimacy": float(current_intimacy),
                "hours_since_interaction": 0,
                "decay_amount": 0,
                "new_intimacy": float(current_intimacy),
                "decay_tier": "none",
            }

        # 解析时间
        if isinstance(last_interaction, str):
            last_dt = datetime.fromisoformat(last_interaction.replace("Z", "+00:00"))
        else:
            last_dt = last_interaction

        now = datetime.now(timezone.utc)
        hours_since = (now - last_dt).total_seconds() / 3600

        grace = INTIMACY_DECAY["grace_hours"]
        mild_max = INTIMACY_DECAY["mild_max_hours"]
        mild_rate = INTIMACY_DECAY["mild_rate"]
        accel_rate = INTIMACY_DECAY["accelerated_rate"]

        if hours_since <= grace:
            decay_amount = 0
            tier = "none"
        elif hours_since <= mild_max:
            # 24~72h：每天 -2%
            days_in_mild = (hours_since - grace) / 24
            decay_amount = current_intimacy * mild_rate * days_in_mild
            tier = "mild"
        else:
            # 72h+：前 48h 温和 + 之后加速
            mild_days = (mild_max - grace) / 24
            mild_decay = current_intimacy * mild_rate * mild_days
            accel_days = (hours_since - mild_max) / 24
            # 加速衰减基于温和衰减后的值
            accel_base = current_intimacy - mild_decay
            accel_decay = accel_base * accel_rate * accel_days
            decay_amount = mild_decay + accel_decay
            tier = "accelerated"

        new_intimacy = max(0, current_intimacy - decay_amount)

        return {
            "current_intimacy": float(current_intimacy),
            "hours_since_interaction": round(hours_since, 1),
            "decay_amount": round(decay_amount, 2),
            "new_intimacy": round(new_intimacy, 2),
            "decay_tier": tier,
        }

    # ========== API 6：喂食（新版食物系统） ==========

    async def feed_pet(
        self,
        pet_id: str,
        food_id: str,
        quantity: int = 1,
        user_id: Optional[str] = None,
    ) -> dict:
        """
        喂食宠物。
        - 查找食物数据
        - 检查是否偏好食物
        - 基础食物检查每日限额
        - 扣减咕噜币（非基础食物）
        - 更新宠物体力和亲密度
        """
        food = get_food_by_id(food_id)
        if not food:
            raise ValueError("食物不存在")

        pet = await self._get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        # 检查宠物状态
        stamina = pet.get("stamina", 0)
        max_stamina = pet.get("max_stamina", 100)
        if stamina == 0:
            # 沉睡状态，只能通过喂食唤醒，所以允许
            pass

        # 偏好食物检查
        preferred_foods = pet.get("preferred_foods", [])
        if isinstance(preferred_foods, str):
            try:
                preferred_foods = json.loads(preferred_foods)
            except (json.JSONDecodeError, TypeError):
                preferred_foods = []
        is_preferred = food_id in preferred_foods

        # 基础食物限额检查
        gulu_coin_spent = 0
        if food.get("is_basic"):
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            usage_key = (user_id or pet.get("user_id", ""), pet_id, today)
            used_count = _mock_feed_usage.get(usage_key, 0)
            if used_count + quantity > DAILY_BASIC_FOOD_LIMIT:
                raise ValueError(f"今日基础食物已达限额（{DAILY_BASIC_FOOD_LIMIT} 份）")
            _mock_feed_usage[usage_key] = used_count + quantity
        else:
            # 非基础食物需要扣咕噜币
            gulu_coin_spent = food["price"] * quantity
            if user_id:
                from app.services.currency_service import CurrencyService
                currency_service = CurrencyService()
                try:
                    await currency_service.operate_currency(
                        user_id=user_id,
                        currency_type="gulu_coin",
                        amount=gulu_coin_spent,
                        operation="spend",
                        reason="feed",
                    )
                except ValueError:
                    raise ValueError("咕噜币不足，无法购买食物")

        # 计算喂食结果
        result = calculate_feed_result(food, is_preferred)
        total_stamina = result["stamina_gained"] * quantity
        total_intimacy = result["intimacy_gained"] * quantity

        # 更新宠物数值
        new_stats = await self.update_stats(
            pet_id,
            stamina_delta=total_stamina,
            intimacy_delta=total_intimacy,
            reason="feed",
        )

        # 记录喂食日志
        await self._log_feed(pet_id, food, is_preferred, total_stamina, total_intimacy, gulu_coin_spent)

        return {
            "stamina_gained": total_stamina,
            "intimacy_gained": total_intimacy,
            "is_preferred": is_preferred,
            "preference_bonus": result["preference_bonus"],
            "new_stamina": new_stats["stamina"],
            "new_intimacy": new_stats["intimacy"],
            "gulu_coin_spent": gulu_coin_spent,
        }

    # ========== 初始化宠物偏好食物 ==========

    async def init_preferred_foods(self, pet_id: str, personality_type: str) -> None:
        """根据宠物性格初始化偏好食物列表"""
        preferred = get_preferred_foods(personality_type)
        await self._update_pet(pet_id, {"preferred_foods": preferred})

    # ========== 内部工具方法 ==========

    async def _get_pet(self, pet_id: str) -> Optional[dict]:
        """获取宠物数据（含 demo 模式降级）"""
        # demo 模式
        if not is_supabase_available():
            pet = _mock_pets_v3.get(pet_id)
            if pet:
                return pet
            # 尝试从旧版 mock 获取
            from app.services.pet_service import _mock_pets
            old_pet = _mock_pets.get(pet_id)
            if old_pet:
                # 补充三维数值默认值
                old_pet.setdefault("stamina", 100)
                old_pet.setdefault("max_stamina", 100)
                old_pet.setdefault("intimacy", 0)
                old_pet.setdefault("max_intimacy", 300)
                old_pet.setdefault("total_energy", 0)
                old_pet.setdefault("max_total_energy", 500)
                old_pet.setdefault("stage_number", 1)
                old_pet.setdefault("preferred_foods", [])
                old_pet.setdefault("last_interaction_at", None)
                _mock_pets_v3[pet_id] = old_pet
                return old_pet
            return None

        try:
            supabase = get_supabase()
            result = supabase.table("pets").select("*").eq("id", pet_id).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning(f"获取宠物失败，降级到内存模式: {e}")
            return _mock_pets_v3.get(pet_id)
        return None

    async def _update_pet(self, pet_id: str, update_data: dict) -> None:
        """更新宠物数据"""
        if not is_supabase_available():
            if pet_id in _mock_pets_v3:
                _mock_pets_v3[pet_id].update(update_data)
            return

        try:
            supabase = get_supabase()
            supabase.table("pets").update(update_data).eq("id", pet_id).execute()
        except Exception as e:
            logger.warning(f"更新宠物失败，降级到内存模式: {e}")
            if pet_id in _mock_pets_v3:
                _mock_pets_v3[pet_id].update(update_data)

    async def _log_feed(
        self,
        pet_id: str,
        food: dict,
        is_preferred: bool,
        stamina_gained: int,
        intimacy_gained: int,
        gulu_coin_spent: int,
    ) -> None:
        """记录喂食日志"""
        log_data = {
            "pet_id": pet_id,
            "food_id": food["id"],
            "food_quality": food["quality"],
            "is_preferred": is_preferred,
            "stamina_gained": stamina_gained,
            "intimacy_gained": intimacy_gained,
            "gulu_coin_spent": gulu_coin_spent,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("feed_logs_v2").insert(log_data).execute()
            except Exception as e:
                logger.warning(f"记录喂食日志失败: {e}")


# ========== 纯函数（供单元测试） ==========

def calculate_decay_amount(
    current_intimacy: float,
    hours_since_interaction: float,
) -> dict:
    """
    纯函数：计算亲密度衰减。
    供单元测试直接调用。
    """
    grace = INTIMACY_DECAY["grace_hours"]
    mild_max = INTIMACY_DECAY["mild_max_hours"]
    mild_rate = INTIMACY_DECAY["mild_rate"]
    accel_rate = INTIMACY_DECAY["accelerated_rate"]

    if hours_since_interaction <= grace:
        return {"decay_amount": 0, "decay_tier": "none", "new_intimacy": current_intimacy}

    if hours_since_interaction <= mild_max:
        days_in_mild = (hours_since_interaction - grace) / 24
        decay = current_intimacy * mild_rate * days_in_mild
        return {
            "decay_amount": round(decay, 2),
            "decay_tier": "mild",
            "new_intimacy": round(max(0, current_intimacy - decay), 2),
        }

    # 加速衰减
    mild_days = (mild_max - grace) / 24
    mild_decay = current_intimacy * mild_rate * mild_days
    accel_days = (hours_since_interaction - mild_max) / 24
    accel_base = current_intimacy - mild_decay
    accel_decay = accel_base * accel_rate * accel_days
    total_decay = mild_decay + accel_decay
    return {
        "decay_amount": round(total_decay, 2),
        "decay_tier": "accelerated",
        "new_intimacy": round(max(0, current_intimacy - total_decay), 2),
    }


def check_evolution_conditions(
    stage_number: int,
    intimacy: int,
    total_energy: int,
    stamina: int,
    max_stamina: int,
) -> dict:
    """
    纯函数：检查进化条件是否满足。
    供单元测试直接调用。
    """
    if stage_number >= 3:
        return {"can_evolve": False, "reason": "已是最高阶段"}

    threshold = EVOLUTION_THRESHOLDS[stage_number]
    stamina_percent = stamina / max_stamina if max_stamina > 0 else 0

    intimacy_met = intimacy >= threshold["intimacy"]
    energy_met = total_energy >= threshold["energy"]
    stamina_met = stamina_percent >= threshold["stamina_percent"]

    return {
        "can_evolve": intimacy_met and energy_met and stamina_met,
        "intimacy_met": intimacy_met,
        "energy_met": energy_met,
        "stamina_met": stamina_met,
        "details": {
            "intimacy": {"current": intimacy, "required": threshold["intimacy"]},
            "energy": {"current": total_energy, "required": threshold["energy"]},
            "stamina_percent": {"current": round(stamina_percent, 2), "required": threshold["stamina_percent"]},
        },
    }

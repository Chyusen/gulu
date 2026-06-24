"""
咕噜 Gulu — 任务服务
对应需求文档 三、货币与任务体系
实现 API 8/9/10
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.database import get_supabase, is_supabase_available
from app.constants.tasks import (
    DAILY_TASK_TEMPLATES, WEEKLY_TASK_TEMPLATES,
    TIER_MULTIPLIERS, ALL_COMPLETE_BONUS,
    STREAK_THRESHOLD, STREAK_BONUS,
    get_tier_multiplier, get_weekly_multiplier,
)

logger = logging.getLogger(__name__)

# demo 模式内存存储
_mock_daily_tasks: dict = {}  # {user_id: [task_dict, ...]}
_mock_weekly_tasks: dict = {}
_mock_streaks: dict = {}  # {user_id: {"streak_days": 0, "last_complete_date": None, "week_daily_all_done": []}}


def _get_daily_reset_time() -> datetime:
    """获取每日任务重置时间（次日凌晨 4:00）"""
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    reset = tomorrow.replace(hour=4, minute=0, second=0, microsecond=0)
    return reset


def _get_weekly_reset_time() -> datetime:
    """获取每周任务重置时间（下周一凌晨 4:00）"""
    now = datetime.now(timezone.utc)
    days_until_monday = (7 - now.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    monday = now + timedelta(days=days_until_monday)
    reset = monday.replace(hour=4, minute=0, second=0, microsecond=0)
    return reset


class TaskService:
    """每日/每周任务管理服务"""

    # ========== API 8：每日任务生成 ==========

    async def get_daily_tasks(self, user_id: str, stage_number: int = 1) -> dict:
        """
        获取每日任务列表。
        - 检查是否需要重置（过期则重新生成）
        - 根据进化阶段确定门槛
        - 计算连击加成
        """
        tasks = await self._load_daily_tasks(user_id)

        # 检查是否过期
        if tasks and self._is_daily_expired(tasks[0]):
            tasks = await self._generate_daily_tasks(user_id, stage_number)

        if not tasks:
            tasks = await self._generate_daily_tasks(user_id, stage_number)

        # 获取连击信息
        streak = await self._get_streak(user_id)
        streak_bonus = STREAK_BONUS if streak["streak_days"] >= STREAK_THRESHOLD else 1.0

        return {
            "tasks": tasks,
            "streak_days": streak["streak_days"],
            "streak_bonus": streak_bonus,
            "reset_at": _get_daily_reset_time().isoformat(),
        }

    # ========== API 9：每周任务生成 ==========

    async def get_weekly_tasks(self, user_id: str) -> dict:
        """
        获取每周任务列表。
        - 检查是否需要重置
        - 计算每日任务完成率系数
        """
        tasks = await self._load_weekly_tasks(user_id)

        if tasks and self._is_weekly_expired(tasks[0]):
            tasks = await self._generate_weekly_tasks(user_id)

        if not tasks:
            tasks = await self._generate_weekly_tasks(user_id)

        # 计算本周每日任务完成率
        streak = await self._get_streak(user_id)
        week_done = streak.get("week_daily_all_done", [])
        completion_rate = sum(1 for x in week_done if x) / 7 if len(week_done) == 7 else 0
        multiplier = get_weekly_multiplier(completion_rate)

        return {
            "tasks": tasks,
            "daily_completion_rate": round(completion_rate, 2),
            "star_dust_multiplier": multiplier,
            "reset_at": _get_weekly_reset_time().isoformat(),
        }

    # ========== API 10：任务进度更新 ==========

    async def update_task_progress(self, task_id: str, progress_delta: int) -> dict:
        """更新任务进度"""
        task = await self._find_task(task_id)
        if not task:
            raise ValueError("任务不存在")

        if task.get("is_claimed"):
            raise ValueError("任务已领取，无法更新进度")

        new_progress = max(0, min(
            task["target_progress"],
            task["current_progress"] + progress_delta,
        ))

        is_completed = new_progress >= task["target_progress"]
        update_data = {
            "current_progress": new_progress,
            "is_completed": is_completed,
        }

        await self._update_task(task_id, update_data, task.get("_is_weekly", False))
        task.update(update_data)
        return task

    # ========== API 10：任务领取 ==========

    async def claim_task(self, task_id: str, user_id: str) -> dict:
        """
        领取任务奖励。
        - 每日任务：计算阶梯奖励和连击加成
        - 每周任务：计算完成率系数
        """
        task = await self._find_task(task_id)
        if not task:
            raise ValueError("任务不存在")

        if not task.get("is_completed"):
            raise ValueError("任务未完成，无法领取")

        if task.get("is_claimed"):
            raise ValueError("任务已领取")

        is_weekly = task.get("_is_weekly", False)

        if is_weekly:
            # 每周任务：星尘奖励 × 完成率系数
            streak = await self._get_streak(user_id)
            week_done = streak.get("week_daily_all_done", [])
            completion_rate = sum(1 for x in week_done if x) / 7 if len(week_done) == 7 else 0
            multiplier = get_weekly_multiplier(completion_rate)
            reward_amount = int(task["base_reward"] * multiplier)
            reward_type = "star_dust"
        else:
            # 每日任务：阶梯奖励 × 连击加成
            all_tasks = await self._load_daily_tasks(user_id)
            completed_count = sum(1 for t in all_tasks if t.get("is_completed"))
            tier = get_tier_multiplier(completed_count)

            streak = await self._get_streak(user_id)
            streak_bonus = STREAK_BONUS if streak["streak_days"] >= STREAK_THRESHOLD else 1.0

            reward_amount = int(task["reward"] * tier * streak_bonus)

            # 5/5 额外奖励
            if completed_count == 5 and all(t.get("is_claimed") or t["id"] == task_id for t in all_tasks):
                reward_amount += ALL_COMPLETE_BONUS

            reward_type = "gulu_coin"

        # 更新任务状态
        await self._update_task(task_id, {"is_claimed": True}, is_weekly)

        # 发放奖励
        from app.services.currency_service import CurrencyService
        currency_service = CurrencyService()
        await currency_service.operate_currency(
            user_id=user_id,
            currency_type=reward_type,
            amount=reward_amount,
            operation="add",
            reason="task_reward",
        )

        # 检查是否全部完成（连击逻辑）
        if not is_weekly:
            await self._check_all_daily_completed(user_id)

        new_balance = await currency_service.get_balance(user_id)

        return {
            "reward_type": reward_type,
            "reward_amount": reward_amount,
            "new_balance": new_balance,
        }

    # ========== 根据类型更新任务进度 ==========

    async def update_progress_by_type(
        self,
        user_id: str,
        task_type: str,
        progress_delta: int = 1,
    ) -> None:
        """
        根据任务类型批量更新进度。
        用于活动完成后自动更新相关任务。
        """
        # 更新每日任务
        daily_tasks = await self._load_daily_tasks(user_id)
        for task in daily_tasks:
            if task["type"] == task_type and not task.get("is_claimed"):
                try:
                    await self.update_task_progress(task["id"], progress_delta)
                except ValueError:
                    pass

        # 更新每周任务
        weekly_tasks = await self._load_weekly_tasks(user_id)
        for task in weekly_tasks:
            if task["type"] == task_type and not task.get("is_claimed"):
                try:
                    await self.update_task_progress(task["id"], progress_delta)
                except ValueError:
                    pass

    # ========== 内部方法 ==========

    def _is_daily_expired(self, task: dict) -> bool:
        """检查每日任务是否过期"""
        expires_at = task.get("expires_at")
        if not expires_at:
            return True
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) > expires_at

    def _is_weekly_expired(self, task: dict) -> bool:
        """检查每周任务是否过期"""
        return self._is_daily_expired(task)

    async def _generate_daily_tasks(self, user_id: str, stage_number: int) -> list:
        """生成每日任务"""
        stage = min(max(stage_number, 1), 3)
        reset_time = _get_daily_reset_time()

        tasks = []
        for template in DAILY_TASK_TEMPLATES:
            target = template["targets"].get(stage, template["targets"][1])
            task = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": template["type"],
                "description": template["description_template"].format(target=target),
                "current_progress": 0,
                "target_progress": target,
                "reward": template["base_reward"],
                "is_completed": False,
                "is_claimed": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": reset_time.isoformat(),
            }
            tasks.append(task)

        await self._save_daily_tasks(user_id, tasks)
        return tasks

    async def _generate_weekly_tasks(self, user_id: str) -> list:
        """生成每周任务"""
        reset_time = _get_weekly_reset_time()

        tasks = []
        for template in WEEKLY_TASK_TEMPLATES:
            task = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": template["type"],
                "description": template["description_template"].format(target=template["target"]),
                "current_progress": 0,
                "target_progress": template["target"],
                "base_reward": template["base_reward"],
                "is_completed": False,
                "is_claimed": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": reset_time.isoformat(),
            }
            tasks.append(task)

        await self._save_weekly_tasks(user_id, tasks)
        return tasks

    async def _load_daily_tasks(self, user_id: str) -> list:
        """加载每日任务"""
        if not is_supabase_available():
            return _mock_daily_tasks.get(user_id, [])

        try:
            supabase = get_supabase()
            result = (
                supabase.table("daily_tasks")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.warning(f"加载每日任务失败，降级到内存模式: {e}")
            return _mock_daily_tasks.get(user_id, [])

    async def _load_weekly_tasks(self, user_id: str) -> list:
        """加载每周任务"""
        if not is_supabase_available():
            return _mock_weekly_tasks.get(user_id, [])

        try:
            supabase = get_supabase()
            result = (
                supabase.table("weekly_tasks")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.warning(f"加载每周任务失败，降级到内存模式: {e}")
            return _mock_weekly_tasks.get(user_id, [])

    async def _save_daily_tasks(self, user_id: str, tasks: list) -> None:
        """保存每日任务"""
        if not is_supabase_available():
            _mock_daily_tasks[user_id] = tasks
            return

        try:
            supabase = get_supabase()
            # 先删除旧任务
            supabase.table("daily_tasks").delete().eq("user_id", user_id).execute()
            # 插入新任务
            for task in tasks:
                supabase.table("daily_tasks").insert(task).execute()
        except Exception as e:
            logger.warning(f"保存每日任务失败，降级到内存模式: {e}")
            _mock_daily_tasks[user_id] = tasks

    async def _save_weekly_tasks(self, user_id: str, tasks: list) -> None:
        """保存每周任务"""
        if not is_supabase_available():
            _mock_weekly_tasks[user_id] = tasks
            return

        try:
            supabase = get_supabase()
            supabase.table("weekly_tasks").delete().eq("user_id", user_id).execute()
            for task in tasks:
                supabase.table("weekly_tasks").insert(task).execute()
        except Exception as e:
            logger.warning(f"保存每周任务失败，降级到内存模式: {e}")
            _mock_weekly_tasks[user_id] = tasks

    async def _find_task(self, task_id: str) -> Optional[dict]:
        """查找任务（每日或每周）"""
        # 先在每日任务中找
        if not is_supabase_available():
            for tasks in _mock_daily_tasks.values():
                for t in tasks:
                    if t["id"] == task_id:
                        return t
            for tasks in _mock_weekly_tasks.values():
                for t in tasks:
                    if t["id"] == task_id:
                        t["_is_weekly"] = True
                        return t
            return None

        try:
            supabase = get_supabase()
            # 查每日任务
            result = supabase.table("daily_tasks").select("*").eq("id", task_id).execute()
            if result.data:
                return result.data[0]
            # 查每周任务
            result = supabase.table("weekly_tasks").select("*").eq("id", task_id).execute()
            if result.data:
                task = result.data[0]
                task["_is_weekly"] = True
                return task
        except Exception as e:
            logger.warning(f"查找任务失败，降级到内存模式: {e}")

        return None

    async def _update_task(self, task_id: str, update_data: dict, is_weekly: bool) -> None:
        """更新任务"""
        table = "weekly_tasks" if is_weekly else "daily_tasks"

        if not is_supabase_available():
            store = _mock_weekly_tasks if is_weekly else _mock_daily_tasks
            for tasks in store.values():
                for t in tasks:
                    if t["id"] == task_id:
                        t.update(update_data)
                        return
            return

        try:
            supabase = get_supabase()
            supabase.table(table).update(update_data).eq("id", task_id).execute()
        except Exception as e:
            logger.warning(f"更新任务失败，降级到内存模式: {e}")

    async def _get_streak(self, user_id: str) -> dict:
        """获取连击记录"""
        if not is_supabase_available():
            return _mock_streaks.get(user_id, {
                "streak_days": 0,
                "last_complete_date": None,
                "week_daily_all_done": [],
            })

        try:
            supabase = get_supabase()
            result = supabase.table("task_streaks").select("*").eq("user_id", user_id).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning(f"获取连击记录失败: {e}")

        return {
            "streak_days": 0,
            "last_complete_date": None,
            "week_daily_all_done": [],
        }

    async def _check_all_daily_completed(self, user_id: str) -> None:
        """检查是否全部每日任务完成，更新连击"""
        tasks = await self._load_daily_tasks(user_id)
        all_completed = all(t.get("is_completed") for t in tasks) if tasks else False

        streak = await self._get_streak(user_id)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        last_date = streak.get("last_complete_date")

        # 更新本周完成记录
        week_done = streak.get("week_daily_all_done", [])
        today_idx = datetime.now(timezone.utc).weekday()
        if len(week_done) < 7:
            week_done = [False] * 7
        if all_completed:
            week_done[today_idx] = True

        # 连击逻辑
        if all_completed:
            if last_date == today:
                pass  # 今天已记录
            elif last_date == (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"):
                streak["streak_days"] = streak.get("streak_days", 0) + 1
            else:
                streak["streak_days"] = 1
            streak["last_complete_date"] = today
        else:
            if last_date and last_date != today:
                yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
                if last_date != yesterday:
                    streak["streak_days"] = 0

        streak["week_daily_all_done"] = week_done

        await self._save_streak(user_id, streak)

    async def _save_streak(self, user_id: str, streak: dict) -> None:
        """保存连击记录"""
        if not is_supabase_available():
            _mock_streaks[user_id] = streak
            return

        try:
            supabase = get_supabase()
            supabase.table("task_streaks").upsert({
                "user_id": user_id,
                "streak_days": streak.get("streak_days", 0),
                "last_complete_date": streak.get("last_complete_date"),
                "week_daily_all_done": streak.get("week_daily_all_done", []),
            }).execute()
        except Exception as e:
            logger.warning(f"保存连击记录失败: {e}")
            _mock_streaks[user_id] = streak

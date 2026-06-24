"""
咕噜 Gulu — AI 图像生成服务
对应 tech-plan-2026 方案三
基于 SiliconFlow Z-Image-Turbo 异步生成形象
"""

import logging
from datetime import date
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.database import get_supabase_safe, is_supabase_available
from app.utils.http_retry import request_with_retry
from app.services.image_prompts import build_prompt

logger = logging.getLogger(__name__)

# 默认模型与尺寸
DEFAULT_MODEL = "Tongyi-MAI/Z-Image-Turbo"
DEFAULT_IMAGE_SIZE = "1024x1024"
DEFAULT_MAX_COUNT = 3

# 占位图
_PLACEHOLDER_URL = "https://placehold.co/1024x1024/6B4EE6/F3E8FF?text=Generating..."

# 内存存储（Demo 降级）
_memory_tasks: Dict[str, Dict[str, Any]] = {}
_memory_quota: Dict[str, Dict[str, Any]] = {}


class ImageGenerationService:
    """AI 图像生成服务"""

    async def create_task(
        self,
        user_id: str,
        gen_type: str,
        style: str,
        custom_prompt: Optional[str] = None,
        user_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        创建生成任务：
        1. 检查每日次数限制
        2. 创建任务记录（pending）
        3. 递增配额
        返回任务对象
        """
        # 检查配额
        quota = await self._check_quota(user_id)
        if quota["used_count"] >= quota["max_count"]:
            raise PermissionError("今日生成次数已达上限，请明日再试")

        prompt_used = build_prompt(gen_type, style, custom_prompt, user_description)

        task = {
            "user_id": user_id,
            "type": gen_type,
            "style": style,
            "custom_prompt": custom_prompt,
            "user_description": user_description,
            "prompt_used": prompt_used,
            "status": "pending",
            "image_url": None,
            "error_msg": None,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = supabase.table("image_generation_tasks").insert(task).execute()
                task_id = resp.data[0]["id"]
                # 递增配额
                await self._increment_quota(user_id)
                task["id"] = task_id
                return {"task_id": task_id, "task": task}
            except Exception as e:
                logger.warning(f"Supabase 写入任务失败，降级到内存: {e}")

        # 内存降级
        import uuid
        task_id = str(uuid.uuid4())
        task["id"] = task_id
        _memory_tasks[task_id] = task
        await self._increment_quota(user_id)
        return {"task_id": task_id, "task": task}

    async def run_task(self, task_id: str) -> Dict[str, Any]:
        """执行生成任务（由 BackgroundTasks 调用）"""
        task = await self._get_task(task_id)
        if not task:
            raise ValueError(f"任务不存在: {task_id}")

        # 更新状态为 generating
        await self._update_task(task_id, {"status": "generating"})

        try:
            image_url = await self._call_siliconflow(task["prompt_used"])
            update = {
                "status": "completed",
                "image_url": image_url,
                "completed_at": "NOW()",
            }
            await self._update_task(task_id, update)
            task["status"] = "completed"
            task["image_url"] = image_url
            return task
        except Exception as e:
            logger.error(f"图像生成失败 task={task_id}: {e}")
            update = {
                "status": "failed",
                "error_msg": str(e),
                "completed_at": "NOW()",
            }
            await self._update_task(task_id, update)
            task["status"] = "failed"
            task["error_msg"] = str(e)
            return task

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """查询任务状态"""
        return await self._get_task(task_id)

    async def list_user_tasks(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """查询用户历史任务"""
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = (
                    supabase.table("image_generation_tasks")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                return resp.data or []
            except Exception as e:
                logger.warning(f"Supabase 查询任务失败: {e}")
        return [t for t in _memory_tasks.values() if t.get("user_id") == user_id][:limit]

    async def get_quota(self, user_id: str) -> Dict[str, Any]:
        """获取用户当日配额"""
        return await self._check_quota(user_id)

    # ========== 内部方法 ==========

    async def _call_siliconflow(self, prompt: str) -> str:
        """调用 SiliconFlow 图像生成 API"""
        if not settings.SILICONFLOW_API_KEY:
            logger.info("未配置 SILICONFLOW_API_KEY，返回占位图")
            return _PLACEHOLDER_URL

        resp = await request_with_retry(
            "POST",
            settings.SILICONFLOW_API_URL,
            headers={
                "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEFAULT_MODEL,
                "prompt": prompt,
                "image_size": DEFAULT_IMAGE_SIZE,
                "batch_size": 1,
            },
            timeout=60,
            retries=2,
        )
        if not resp:
            raise RuntimeError("SiliconFlow API 请求失败")

        data = resp.json()
        # 兼容 images / data 两种返回格式
        images = data.get("images") or data.get("data") or []
        if images:
            url = images[0].get("url", "")
            if url:
                return url
        raise RuntimeError("SiliconFlow 返回结果中未找到图片 URL")

    async def _check_quota(self, user_id: str) -> Dict[str, Any]:
        """检查用户当日配额"""
        today = date.today().isoformat()
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = (
                    supabase.table("user_generation_quota")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("reset_date", today)
                    .execute()
                )
                if resp.data:
                    return resp.data[0]
                return {
                    "user_id": user_id,
                    "used_count": 0,
                    "max_count": DEFAULT_MAX_COUNT,
                    "reset_date": today,
                }
            except Exception as e:
                logger.warning(f"Supabase 查询配额失败: {e}")

        key = f"{user_id}:{today}"
        if key not in _memory_quota:
            _memory_quota[key] = {
                "user_id": user_id,
                "used_count": 0,
                "max_count": DEFAULT_MAX_COUNT,
                "reset_date": today,
            }
        return _memory_quota[key]

    async def _increment_quota(self, user_id: str) -> None:
        """递增用户当日配额"""
        today = date.today().isoformat()
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                existing = (
                    supabase.table("user_generation_quota")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("reset_date", today)
                    .execute()
                )
                if existing.data:
                    new_count = existing.data[0]["used_count"] + 1
                    (
                        supabase.table("user_generation_quota")
                        .update({"used_count": new_count})
                        .eq("user_id", user_id)
                        .eq("reset_date", today)
                        .execute()
                    )
                else:
                    (
                        supabase.table("user_generation_quota")
                        .insert({
                            "user_id": user_id,
                            "used_count": 1,
                            "max_count": DEFAULT_MAX_COUNT,
                            "reset_date": today,
                        })
                        .execute()
                    )
                return
            except Exception as e:
                logger.warning(f"Supabase 递增配额失败: {e}")

        key = f"{user_id}:{today}"
        if key not in _memory_quota:
            _memory_quota[key] = {
                "user_id": user_id,
                "used_count": 0,
                "max_count": DEFAULT_MAX_COUNT,
                "reset_date": today,
            }
        _memory_quota[key]["used_count"] += 1

    async def _get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务"""
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = (
                    supabase.table("image_generation_tasks")
                    .select("*")
                    .eq("id", task_id)
                    .execute()
                )
                if resp.data:
                    return resp.data[0]
                return None
            except Exception as e:
                logger.warning(f"Supabase 查询任务失败: {e}")
        return _memory_tasks.get(task_id)

    async def _update_task(self, task_id: str, update: Dict[str, Any]) -> None:
        """更新任务"""
        # 处理 NOW() 特殊值
        clean_update = {}
        for k, v in update.items():
            if v == "NOW()":
                from datetime import datetime, timezone
                clean_update[k] = datetime.now(timezone.utc).isoformat()
            else:
                clean_update[k] = v

        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                (
                    supabase.table("image_generation_tasks")
                    .update(clean_update)
                    .eq("id", task_id)
                    .execute()
                )
                return
            except Exception as e:
                logger.warning(f"Supabase 更新任务失败: {e}")

        if task_id in _memory_tasks:
            _memory_tasks[task_id].update(clean_update)

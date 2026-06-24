"""
咕噜 Gulu — Redis 连接
对应需求文档 1.1.9 配置 Redis 连接
对话上下文缓存
"""

import json
from typing import Optional
import redis.asyncio as redis
from app.core.config import settings

_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """获取 Redis 客户端"""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def init_redis():
    """初始化 Redis 连接"""
    global _redis_client
    try:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        await _redis_client.ping()
        print("[OK] Redis 连接成功")
    except Exception as e:
        print(f"[WARN] Redis 连接失败: {e}")
        _redis_client = None


async def close_redis():
    """关闭 Redis 连接"""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


# ========== 对话上下文缓存 ==========

async def cache_chat_context(user_id: str, pet_id: str, messages: list) -> None:
    """缓存对话上下文（最近10轮）。Redis 不可用时静默跳过。"""
    if not _redis_client:
        return
    try:
        key = f"chat_context:{user_id}:{pet_id}"
        # 只保留最近 20 条（10轮）
        recent = messages[-20:]
        await _redis_client.setex(
            key,
            settings.REDIS_CHAT_TTL,
            json.dumps(recent, ensure_ascii=False),
        )
    except Exception:
        # Redis 连接失败时静默跳过（Demo 降级）
        pass


async def get_chat_context(user_id: str, pet_id: str) -> list:
    """获取缓存的对话上下文。Redis 不可用时返回空列表。"""
    if not _redis_client:
        return []
    try:
        key = f"chat_context:{user_id}:{pet_id}"
        data = await _redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        # Redis 连接失败时静默跳过（Demo 降级）
        pass
    return []

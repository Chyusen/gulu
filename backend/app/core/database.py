"""
咕噜 Gulu — 数据库连接（Supabase）
对应需求文档 1.1.8 配置 Supabase 连接
v2.0 新增：is_supabase_available / get_supabase_safe 支持 demo 模式降级
"""

from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

_supabase_client: Optional[Client] = None
_supabase_available: bool = False


def is_supabase_available() -> bool:
    """检查 Supabase 是否已配置且可用"""
    return _supabase_available


def get_supabase() -> Client:
    """获取 Supabase 客户端（未配置或初始化失败时抛出 RuntimeError）"""
    if _supabase_client is None:
        raise RuntimeError("Supabase 客户端未初始化")
    return _supabase_client


def get_supabase_safe() -> Optional[Client]:
    """获取 Supabase 客户端，未配置时返回 None（不抛异常）"""
    return _supabase_client


async def init_db():
    """初始化数据库连接；连接失败时降级到 demo 模式，不阻塞启动"""
    global _supabase_client, _supabase_available
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print("[WARN] Supabase 未配置，跳过连接（demo 模式：使用内存降级）")
        return
    try:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
        )
        _supabase_available = True
        print("[OK] Supabase 连接成功")
    except Exception as e:
        _supabase_client = None
        _supabase_available = False
        print(f"[WARN] Supabase 连接失败，降级到 demo 模式: {e}")

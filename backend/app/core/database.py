"""
咕噜 Gulu — 数据库连接（Supabase）
对应需求文档 1.1.8 配置 Supabase 连接
v2.0 新增：is_supabase_available / get_supabase_safe 支持 demo 模式降级
"""

from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

_supabase_client: Optional[Client] = None


def is_supabase_available() -> bool:
    """检查 Supabase 是否已配置且可用"""
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)


def get_supabase() -> Client:
    """获取 Supabase 客户端（未配置时抛出 RuntimeError）"""
    global _supabase_client
    if _supabase_client is None:
        if not is_supabase_available():
            raise RuntimeError("Supabase URL 和 KEY 未配置")
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
        )
    return _supabase_client


def get_supabase_safe() -> Optional[Client]:
    """获取 Supabase 客户端，未配置时返回 None（不抛异常）"""
    if not is_supabase_available():
        return None
    return get_supabase()


async def init_db():
    """初始化数据库连接"""
    if is_supabase_available():
        get_supabase()
        print("[OK] Supabase 连接成功")
    else:
        print("[WARN] Supabase 未配置，跳过连接（demo 模式：使用内存降级）")

"""
咕噜 Gulu — 核心配置
对应需求文档 1.1.8/1.1.9 配置 Supabase/Redis 连接
"""

from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """应用配置"""

    # 应用
    APP_NAME: str = "咕噜 Gulu"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["*"]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CHAT_TTL: int = 86400  # 对话上下文缓存 24 小时

    # DeepSeek API
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/chat/completions"
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"

    # SiliconFlow API（图像生成）
    SILICONFLOW_API_KEY: str = ""
    SILICONFLOW_API_URL: str = "https://api.siliconflow.cn/v1/images/generations"

    # 高德地图
    AMAP_API_KEY: str = ""
    AMAP_API_URL: str = "https://restapi.amap.com/v3"
    AMAP_WEB_KEY: str = ""
    AMAP_JSAPI_SECRET: str = ""
    AMAP_IOS_KEY: str = ""
    AMAP_ANDROID_KEY: str = ""

    # SiliconFlow Embedding（BGE-m3）
    SILICONFLOW_EMBEDDING_URL: str = "https://api.siliconflow.cn/v1/embeddings"
    SILICONFLOW_EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # Sentry
    SENTRY_DSN: str = ""

    # 养成系统参数
    ENERGY_DAILY_LOGIN: int = 20
    ENERGY_SOUL_FEAST: int = 50
    ENERGY_FORGET_GRASS: int = 30
    ENERGY_NATURAL_DECAY: int = 10
    ENERGY_HEALTHY_THRESHOLD: int = 70
    ENERGY_WEAK_THRESHOLD: int = 30

    # 灰化症参数
    GRAYING_TRIGGER_DAYS: int = 3
    GRAYING_MAX_SEVERITY: int = 5

    # 进化条件
    EVOLUTION_STAGE1_ACTION_COUNT: int = 10
    EVOLUTION_STAGE2_ACTION_COUNT: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

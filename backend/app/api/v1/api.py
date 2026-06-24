"""
咕噜 Gulu — API 路由聚合
v3.0 新增 evolution/currency/tasks/activities/utils/friends 路由
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    profile, pets, chat, style, citywalk, social,
    users, explore,
    evolution, currency, tasks, activities, utils, friends,
    images, map, recommendations,
)

api_router = APIRouter()

# ========== v3.0 新增路由（宠物进化与核心机制重构） ==========

# 进化相关（挂载在 /pets 下）
api_router.include_router(evolution.router, prefix="/pets", tags=["evolution"])

# 货币（挂载在 /users 下）
api_router.include_router(currency.router, prefix="/users", tags=["currency"])

# 任务
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])

# 探索活动（散步/运动/室内/自主探索/悄悄话）
api_router.include_router(activities.router, prefix="/explore", tags=["activities"])

# 工具（昵称审查）
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])

# 好友系统
api_router.include_router(friends.router, prefix="/friends", tags=["friends"])

# ========== v2.0 新增路由 ==========

# 用户画像（v2.0 重构）
api_router.include_router(users.router, prefix="/users", tags=["users"])

# 探索（附近发现 + Citywalk 攻略）
api_router.include_router(explore.router, prefix="/explore", tags=["explore"])

# ========== 旧版路由保留兼容 ==========

# 用户画像（旧版）
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])

# 宠物管理（v2.0 已扩展）
api_router.include_router(pets.router, prefix="/pets", tags=["pets"])

# 对话
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# 风格生成
api_router.include_router(style.router, prefix="/style", tags=["style"])

# Citywalk（旧版会话管理）
api_router.include_router(citywalk.router, prefix="/citywalk", tags=["citywalk"])

# 宠物社交（旧版）
api_router.include_router(social.router, prefix="/social", tags=["social"])

# ========== tech-plan-2026 三大板块路由 ==========

# AI 生成形象
api_router.include_router(images.router, prefix="/images", tags=["images"])

# 高德地图
api_router.include_router(map.router, prefix="/map", tags=["map"])

# 小红书攻略推荐
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])

"""
咕噜 Gulu — 探索接口（v2.0 新增）
对应后端 Agent 开发 Prompt：
- API 4：GET /api/v1/explore/nearby
- API 5：POST /api/v1/explore/citywalk/guides
与需求文档 第五章 探索页对齐
"""

import logging
from fastapi import APIRouter, Depends, Header, Query
from typing import Optional
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.explore import (
    NearbyData,
    NearbyPetItem,
    NearbyUserItem,
    XiaohongshuNoteItem,
    CitywalkGuideRequest,
    CitywalkGuidesData,
    CitywalkGuide,
    PoiItem,
)
from app.services.explore_service import ExploreService

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_user_id_from_header(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Optional[str]:
    """从请求头 X-User-Id 获取当前登录用户 ID（可选）"""
    return x_user_id


@router.get("/nearby", response_model=ApiResponse)
async def nearby(
    lat: float = Query(..., ge=-90, le=90, description="纬度"),
    lng: float = Query(..., ge=-180, le=180, description="经度"),
    radius: int = Query(5000, ge=100, le=50000, description="搜索半径（米）"),
    limit: int = Query(20, ge=1, le=100, description="返回数量上限"),
    current_user_id: Optional[str] = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """
    附近宠物/用户发现（v2.0 API 4）。
    对应需求文档 5.2 地图标记。
    """
    service = ExploreService()
    try:
        result = await service.discover_nearby(
            lat=lat,
            lng=lng,
            radius=radius,
            limit=limit,
            current_user_id=current_user_id,
        )
        pets = [NearbyPetItem(**p) for p in result.get("pets", [])]
        users = [NearbyUserItem(**u) for u in result.get("users", [])]
        notes = [XiaohongshuNoteItem(**n) for n in result.get("xiaohongshu_notes", [])]
        return ApiResponse.success(
            data=NearbyData(pets=pets, users=users, xiaohongshu_notes=notes),
        )
    except Exception as e:
        logger.exception(f"附近发现失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="附近发现失败")


@router.post("/citywalk/guides", response_model=ApiResponse)
async def citywalk_guides(
    data: CitywalkGuideRequest,
    current_user_id: Optional[str] = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """
    Citywalk 攻略检索（v2.0 API 5）。
    对应需求文档 5.3 Citywalk 攻略。
    - 真实 POI 检索（高德 API）。
    - AI 攻略生成（DeepSeek）。
    - Redis 缓存 24 小时。
    """
    service = ExploreService()
    try:
        result = await service.get_citywalk_guides(
            mbti=data.mbti,
            zodiac=data.zodiac,
            lat=data.lat,
            lng=data.lng,
            city=data.city,
            radius=data.radius,
            limit=data.limit,
        )
        guides = []
        for g in result.get("guides", []):
            pois = [PoiItem(**p) for p in g.get("pois", [])]
            guides.append(CitywalkGuide(
                id=g["id"],
                title=g.get("title", ""),
                tags=g.get("tags", []),
                summary=g.get("summary", ""),
                duration=g.get("duration", ""),
                distance=g.get("distance", ""),
                pois=pois,
            ))
        return ApiResponse.success(
            data=CitywalkGuidesData(
                guides=guides,
                city=result.get("city"),
                cached=result.get("cached", False),
            )
        )
    except Exception as e:
        logger.exception(f"Citywalk 攻略生成失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="Citywalk 攻略生成失败")

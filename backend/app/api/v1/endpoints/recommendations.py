"""
咕噜 Gulu — 推荐接口
对应 tech-plan-2026 方案一
"""

import logging
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.schemas.common import ApiResponse, ErrorCode
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)
router = APIRouter()
_service = RecommendationService()


class RecommendRequest(BaseModel):
    """推荐请求"""
    user_id: str = Field(..., description="用户 ID")
    top_k: int = Field(5, ge=1, le=20, description="返回条数")
    mbti: Optional[str] = Field(None, description="MBTI 类型（可选，覆盖数据库值）")
    zodiac: Optional[str] = Field(None, description="星座（可选，覆盖数据库值）")
    location: Optional[str] = Field(None, description="经度,纬度（可选，传入后生成基于当前位置的攻略）")


@router.post("/contents", response_model=ApiResponse)
async def recommend_contents(data: RecommendRequest) -> ApiResponse:
    """基于用户画像 + 当前位置推荐内容"""
    try:
        result = await _service.recommend_contents(
            user_id=data.user_id,
            top_k=data.top_k,
            mbti=data.mbti,
            zodiac=data.zodiac,
            location=data.location,
        )
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"推荐失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="推荐失败")


@router.get("/contents", response_model=ApiResponse)
async def recommend_contents_get(
    user_id: str,
    top_k: int = 5,
    mbti: Optional[str] = None,
    zodiac: Optional[str] = None,
    location: Optional[str] = None,
) -> ApiResponse:
    """基于用户画像 + 当前位置推荐内容（GET 方式）"""
    try:
        result = await _service.recommend_contents(
            user_id=user_id,
            top_k=top_k,
            mbti=mbti,
            zodiac=zodiac,
            location=location,
        )
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"推荐失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="推荐失败")


@router.get("/contents/list", response_model=ApiResponse)
async def list_contents(
    page: int = 1,
    limit: int = 20,
    platform: Optional[str] = None,
) -> ApiResponse:
    """获取内容列表"""
    try:
        from app.core.database import get_supabase_safe, is_supabase_available
        if is_supabase_available():
            supabase = get_supabase_safe()
            query = supabase.table("content_items").select("*")
            if platform:
                query = query.eq("platform", platform)
            query = query.order("created_at", desc=True)
            query = query.range((page - 1) * limit, page * limit - 1)
            resp = query.execute()
            return ApiResponse.success(data={"contents": resp.data or [], "page": page})
        return ApiResponse.success(data={"contents": [], "page": page, "_mock": True})
    except Exception as e:
        logger.exception(f"获取内容列表失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取内容列表失败")


class LocationRecommendRequest(BaseModel):
    """基于位置的推荐请求"""
    user_id: str = Field(..., description="用户 ID")
    location: str = Field(..., description="经度,纬度")
    mbti: Optional[str] = Field(None, description="MBTI 类型")
    zodiac: Optional[str] = Field(None, description="星座")
    top_k: int = Field(5, ge=1, le=10, description="返回条数")


@router.post("/location", response_model=ApiResponse)
async def recommend_by_location(data: LocationRecommendRequest) -> ApiResponse:
    """基于用户当前位置的实时 AI 推荐"""
    try:
        result = await _service.recommend_by_location(
            user_id=data.user_id,
            location=data.location,
            mbti=data.mbti,
            zodiac=data.zodiac,
            top_k=data.top_k,
        )
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"位置推荐失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="位置推荐失败")

"""
咕噜 Gulu — 用户画像接口（v2.0 重构，v3.0 新增 gender）
对应后端 Agent 开发 Prompt API 1：POST /api/v1/users/profile
与需求文档 3.10 MBTI 快捷入口 / 7.1 用户画像对齐
v3.0 对应需求文档 5.1 性别设置
"""

import logging
from fastapi import APIRouter, Depends, Header, HTTPException
from typing import Optional
from app.core.database import get_supabase
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.profile import ProfileSaveRequest, ProfileData
from app.services.profile_service import ProfileService
from supabase import Client

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_user_id_from_header(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Optional[str]:
    """
    从请求头 X-User-Id 获取当前登录用户 ID。
    第一期简化方案：前端在请求头传 X-User-Id。
    后续接入 Supabase Auth 后改为解析 JWT。
    保存画像时允许为空（首次创建），获取画像时必填。
    """
    return x_user_id


@router.post("/profile", response_model=ApiResponse)
async def save_profile(
    data: ProfileSaveRequest,
    user_id: Optional[str] = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """
    保存用户画像（nickname、mbti、zodiac、gender）。
    对应需求文档 7.1 用户画像 + 5.1 性别设置。
    - 若 X-User-Id 存在则更新；否则新建用户。
    - v3.0 新增 gender 字段。
    """
    service = ProfileService()
    try:
        result = await service.save_profile(data, user_id)
        return ApiResponse.success(
            data=ProfileData(
                id=result["id"],
                nickname=result.get("nickname", ""),
                mbti=result.get("mbti", ""),
                zodiac=result.get("zodiac", ""),
                gender=result.get("gender"),
            ),
            message="用户画像保存成功",
        )
    except ValueError as e:
        logger.warning(f"保存用户画像参数错误: {e}")
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"保存用户画像失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="保存用户画像失败")


@router.get("/profile/{user_id}", response_model=ApiResponse)
async def get_profile(user_id: str) -> ApiResponse:
    """获取用户画像"""
    service = ProfileService()
    try:
        result = await service.get_profile(user_id)
        if not result:
            return ApiResponse.error(code=ErrorCode.NOT_FOUND, message="用户不存在")
        return ApiResponse.success(
            data=ProfileData(
                id=result.get("id", user_id),
                nickname=result.get("nickname", ""),
                mbti=result.get("mbti", ""),
                zodiac=result.get("zodiac", ""),
                gender=result.get("gender"),
            )
        )
    except Exception as e:
        logger.exception(f"获取用户画像失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取用户画像失败")

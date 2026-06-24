"""
咕噜 Gulu — 探索活动接口
对应 API 11/12/13
"""

import logging
from fastapi import APIRouter, Depends, Header, Query
from typing import Optional
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.activity import (
    ActivityRequest, ActivityData,
    CompanionRequest, CompanionData,
    AutoExploreStartRequest, AutoExploreStartData,
    AutoExploreCompleteRequest, AutoExploreCompleteData,
)
from app.services.companion_service import CompanionService
from app.services.auto_explore_service import AutoExploreService

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_user_id_from_header(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> str:
    if not x_user_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=401,
            detail={"code": ErrorCode.UNAUTHORIZED, "message": "请在请求头携带 X-User-Id"},
        )
    return x_user_id


# ========== API 11：散步/运动记录 ==========

@router.post("/activity", response_model=ApiResponse)
async def execute_activity(
    data: ActivityRequest,
    pet_id: str = Query(..., description="宠物 ID"),
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """散步/运动/Citywalk 活动记录"""
    service = CompanionService()
    try:
        result = await service.execute_activity(
            user_id=user_id,
            pet_id=pet_id,
            activity_type=data.activity_type,
            duration_minutes=data.duration_minutes,
            distance_meters=data.distance_meters,
        )
        return ApiResponse.success(data=ActivityData(**result))
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"活动记录失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="活动记录失败")


# ========== API 12：室内陪伴活动 ==========

@router.post("/companion", response_model=ApiResponse)
async def execute_companion(
    data: CompanionRequest,
    pet_id: str = Query(..., description="宠物 ID"),
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """室内陪伴活动"""
    service = CompanionService()
    try:
        result = await service.execute_companion(
            user_id=user_id,
            pet_id=pet_id,
            activity_type=data.activity_type,
            duration_minutes=data.duration_minutes,
        )
        return ApiResponse.success(data=CompanionData(**result))
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"陪伴活动失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="陪伴活动失败")


# ========== API 13：宠物自主探索 ==========

@router.post("/auto-explore/start", response_model=ApiResponse)
async def start_auto_explore(
    data: AutoExploreStartRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """开始宠物自主探索"""
    service = AutoExploreService()
    try:
        result = await service.start_auto_explore(
            pet_id=data.pet_id,
            duration_hours=data.duration_hours,
            user_id=user_id,
        )
        return ApiResponse.success(
            data=AutoExploreStartData(**result),
            message="咕噜出发去探索啦！",
        )
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"开始自主探索失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="开始自主探索失败")


@router.post("/auto-explore/complete", response_model=ApiResponse)
async def complete_auto_explore(
    data: AutoExploreCompleteRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """完成宠物自主探索"""
    service = AutoExploreService()
    try:
        result = await service.complete_auto_explore(
            pet_id=data.pet_id,
            user_id=user_id,
        )
        return ApiResponse.success(
            data=AutoExploreCompleteData(**result),
            message="咕噜回来啦！",
        )
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"完成自主探索失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="完成自主探索失败")


@router.get("/auto-explore/check", response_model=ApiResponse)
async def check_auto_explore(
    pet_id: str = Query(..., description="宠物 ID"),
) -> ApiResponse:
    """检查自主探索是否完成"""
    service = AutoExploreService()
    try:
        result = await service.check_auto_explore_complete(pet_id)
        if result:
            return ApiResponse.success(data={"is_ready": True, "explore": result})
        return ApiResponse.success(data={"is_ready": False})
    except Exception as e:
        logger.exception(f"检查自主探索失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="检查自主探索失败")


@router.get("/whispers", response_model=ApiResponse)
async def get_whispers(
    pet_id: str = Query(..., description="宠物 ID"),
) -> ApiResponse:
    """获取咕噜悄悄话列表"""
    service = AutoExploreService()
    try:
        result = await service.get_whispers(pet_id)
        return ApiResponse.success(data={"whispers": result})
    except Exception as e:
        logger.exception(f"获取悄悄话失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取悄悄话失败")

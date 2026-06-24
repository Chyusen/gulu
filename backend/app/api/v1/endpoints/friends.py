"""
咕噜 Gulu — 好友系统接口
对应 API 16
"""

import logging
from fastapi import APIRouter, Depends, Header, Query
from typing import Optional
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.friend import (
    AddFriendRequest, BlockRequest, ReportRequest,
    ExplorePrivacyRequest, ExplorePrivacyData,
)
from app.services.friend_service import FriendService

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


@router.get("", response_model=ApiResponse)
async def get_friends(
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """获取好友列表"""
    service = FriendService()
    try:
        result = await service.get_friends(user_id)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"获取好友列表失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取好友列表失败")


@router.post("/add", response_model=ApiResponse)
async def add_friend(
    data: AddFriendRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """添加好友"""
    service = FriendService()
    try:
        result = await service.add_friend(user_id, data.target_user_id)
        return ApiResponse.success(data=result, message="添加成功")
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"添加好友失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="添加好友失败")


@router.post("/block", response_model=ApiResponse)
async def block_user(
    data: BlockRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """拉黑用户"""
    service = FriendService()
    try:
        result = await service.block_user(user_id, data.target_user_id)
        return ApiResponse.success(data=result, message="已拉黑")
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"拉黑失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="拉黑失败")


@router.post("/report", response_model=ApiResponse)
async def report_user(
    data: ReportRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """举报用户"""
    service = FriendService()
    try:
        result = await service.report_user(
            reporter_id=user_id,
            target_id=data.target_user_id,
            reason=data.reason,
            description=data.description,
        )
        return ApiResponse.success(data=result, message="举报已提交")
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"举报失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="举报失败")


@router.get("/privacy", response_model=ApiResponse)
async def get_explore_privacy(
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """获取探索隐私设置"""
    service = FriendService()
    try:
        result = await service.get_explore_privacy(user_id)
        return ApiResponse.success(data=ExplorePrivacyData(**result))
    except Exception as e:
        logger.exception(f"获取隐私设置失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取隐私设置失败")


@router.post("/privacy", response_model=ApiResponse)
async def update_explore_privacy(
    data: ExplorePrivacyRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """更新探索隐私设置"""
    service = FriendService()
    try:
        result = await service.update_explore_privacy(
            user_id=user_id,
            show_gender=data.show_gender,
            show_mbti=data.show_mbti,
            show_zodiac=data.show_zodiac,
        )
        return ApiResponse.success(data=ExplorePrivacyData(**result))
    except Exception as e:
        logger.exception(f"更新隐私设置失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="更新隐私设置失败")

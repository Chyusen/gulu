"""
咕噜 Gulu — 任务接口
对应 API 8/9/10
"""

import logging
from fastapi import APIRouter, Query
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.task import TaskProgressRequest, TaskClaimData
from app.services.task_service import TaskService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/daily", response_model=ApiResponse)
async def get_daily_tasks(
    user_id: str = Query(..., description="用户 ID"),
    stage_number: int = Query(1, ge=1, le=3, description="宠物进化阶段"),
) -> ApiResponse:
    """获取每日任务"""
    service = TaskService()
    try:
        result = await service.get_daily_tasks(user_id, stage_number)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"获取每日任务失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取每日任务失败")


@router.get("/weekly", response_model=ApiResponse)
async def get_weekly_tasks(
    user_id: str = Query(..., description="用户 ID"),
) -> ApiResponse:
    """获取每周任务"""
    service = TaskService()
    try:
        result = await service.get_weekly_tasks(user_id)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"获取每周任务失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取每周任务失败")


@router.put("/{task_id}/progress", response_model=ApiResponse)
async def update_task_progress(
    task_id: str,
    data: TaskProgressRequest,
) -> ApiResponse:
    """更新任务进度"""
    service = TaskService()
    try:
        result = await service.update_task_progress(task_id, data.progress_delta)
        return ApiResponse.success(data=result)
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"更新任务进度失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="更新任务进度失败")


@router.post("/{task_id}/claim", response_model=ApiResponse)
async def claim_task(
    task_id: str,
    user_id: str = Query(..., description="用户 ID"),
) -> ApiResponse:
    """领取任务奖励"""
    service = TaskService()
    try:
        result = await service.claim_task(task_id, user_id)
        return ApiResponse.success(data=result)
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"领取任务奖励失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="领取任务奖励失败")

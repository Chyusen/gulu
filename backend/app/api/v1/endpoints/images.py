"""
咕噜 Gulu — AI 图像生成接口
对应 tech-plan-2026 方案三
"""

import logging
from fastapi import APIRouter, BackgroundTasks
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.image_generation import ImageGenerateRequest
from app.services.image_generation_service import ImageGenerationService

logger = logging.getLogger(__name__)
router = APIRouter()
_service = ImageGenerationService()


@router.post("/generate", response_model=ApiResponse)
async def generate_image(
    data: ImageGenerateRequest,
    background_tasks: BackgroundTasks,
) -> ApiResponse:
    """
    提交图像生成请求
    - 检查每日次数限制
    - 创建异步任务
    - 返回 task_id
    """
    try:
        result = await _service.create_task(
            user_id=data.user_id,
            gen_type=data.type,
            style=data.style,
            custom_prompt=data.custom_prompt,
            user_description=data.user_description,
        )
        task_id = result["task_id"]
        # 异步执行生成
        background_tasks.add_task(_service.run_task, task_id)
        return ApiResponse.success(
            data={"task_id": task_id, "status": "pending"},
            message="生成任务已提交",
        )
    except PermissionError as e:
        return ApiResponse.error(code=ErrorCode.FORBIDDEN, message=str(e))
    except Exception as e:
        logger.exception(f"创建图像生成任务失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="创建生成任务失败")


@router.get("/tasks/{task_id}", response_model=ApiResponse)
async def get_task(task_id: str) -> ApiResponse:
    """查询任务状态"""
    try:
        task = await _service.get_task(task_id)
        if not task:
            return ApiResponse.error(code=ErrorCode.NOT_FOUND, message="任务不存在")
        return ApiResponse.success(data=task)
    except Exception as e:
        logger.exception(f"查询任务失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="查询任务失败")


@router.get("/tasks", response_model=ApiResponse)
async def list_tasks(user_id: str, limit: int = 20) -> ApiResponse:
    """查询用户历史任务"""
    try:
        tasks = await _service.list_user_tasks(user_id, limit=limit)
        return ApiResponse.success(data={"tasks": tasks, "total": len(tasks)})
    except Exception as e:
        logger.exception(f"查询任务列表失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="查询任务列表失败")


@router.get("/quota", response_model=ApiResponse)
async def get_quota(user_id: str) -> ApiResponse:
    """查询用户当日生成配额"""
    try:
        quota = await _service.get_quota(user_id)
        return ApiResponse.success(data=quota)
    except Exception as e:
        logger.exception(f"查询配额失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="查询配额失败")


@router.get("/styles", response_model=ApiResponse)
async def list_styles() -> ApiResponse:
    """获取支持的风格列表"""
    from app.services.image_prompts import STYLE_PROMPTS, TYPE_BASE_PROMPTS
    return ApiResponse.success(data={
        "styles": list(STYLE_PROMPTS.keys()),
        "types": list(TYPE_BASE_PROMPTS.keys()),
    })

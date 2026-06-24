"""
咕噜 Gulu — 宠物管理接口
对应需求文档 5.2 宠物管理接口
v2.0 新增：POST /api/v1/pets（创建宠物）、POST /api/v1/pets/generate-image、GET /api/v1/pets/generate-image/{task_id}
"""

import logging
from fastapi import APIRouter, HTTPException, Header, Query, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from app.services.pet_service import PetService
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.pet import (
    GenerateImageRequest,
    ImageTaskData,
    CreatePetRequest,
    PetData,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# 旧版请求模型（保留兼容）
class PetGenerate(BaseModel):
    user_id: str
    style: str
    custom_description: Optional[str] = None
    name: Optional[str] = None


class FeedRequest(BaseModel):
    feed_type: Literal["sunlight", "moonlight", "soul_feast", "forget_grass"]


class HealRequest(BaseModel):
    heal_action: Literal["breathing", "look_green", "walk", "meditation"]


class InteractRequest(BaseModel):
    interaction_type: Literal["pet", "poke", "hug", "wake"]


class StyleUpdate(BaseModel):
    style: str


def _get_user_id_from_header(x_user_id: Optional[str] = Header(default=None, alias="X-User-Id")) -> str:
    """
    从请求头 X-User-Id 获取当前登录用户 ID。
    第一期简化方案：前端在请求头传 X-User-Id。
    后续接入 Supabase Auth 后改为解析 JWT。
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail={"code": ErrorCode.UNAUTHORIZED, "message": "未登录，请在请求头携带 X-User-Id"},
        )
    return x_user_id


# ========== v2.0 新增接口 ==========

@router.post("", response_model=ApiResponse)
@router.post("/", response_model=ApiResponse, include_in_schema=False)
async def create_pet(
    data: CreatePetRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """
    创建宠物（v2.0 API 3）。
    对应需求文档 7.2 宠物创建。
    """
    service = PetService()
    try:
        result = await service.create_pet(
            user_id=user_id,
            name=data.name,
            style=data.style,
            custom_description=data.custom_description,
            image_task_id=data.image_task_id,
        )
        return ApiResponse.success(
            data=PetData(**result),
            message="宠物创建成功",
        )
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"创建宠物失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="创建宠物失败")


@router.post("/generate-image", response_model=ApiResponse)
async def generate_image(
    data: GenerateImageRequest,
    user_id: str = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """
    AI 宠物形象生成（v2.0 API 2）。
    对应需求文档 3.8 Step 6 基因注入。
    - 同步快速返回 task_id 与状态。
    - 若 SD 生成较快则直接返回 completed；否则返回 pending/generating，前端轮询。
    """
    service = PetService()
    try:
        result = await service.create_image_task(
            style=data.style,
            custom_prompt=data.custom_prompt,
            mbti=data.mbti,
            zodiac=data.zodiac,
            user_id=user_id,
        )
        return ApiResponse.success(
            data=ImageTaskData(
                task_id=result["task_id"],
                status=result["status"],
                image_url=result.get("image_url"),
                prompt_used=result.get("prompt_used"),
                error_msg=result.get("error_msg"),
            ),
            message="生成任务已创建",
        )
    except Exception as e:
        logger.exception(f"创建图像任务失败: {e}")
        return ApiResponse.error(
            code=ErrorCode.GENERATION_FAILED,
            message=f"创建图像任务失败: {e}",
        )


@router.get("/generate-image/{task_id}", response_model=ApiResponse)
async def poll_image_task(task_id: str) -> ApiResponse:
    """
    轮询查询图像生成任务状态（v2.0 API 2）。
    """
    service = PetService()
    try:
        result = await service.poll_image_task(task_id)
        if not result:
            return ApiResponse.error(code=ErrorCode.NOT_FOUND, message="任务不存在")
        return ApiResponse.success(
            data=ImageTaskData(
                task_id=result["task_id"],
                status=result["status"],
                image_url=result.get("image_url"),
                prompt_used=result.get("prompt_used"),
                error_msg=result.get("error_msg"),
            )
        )
    except Exception as e:
        logger.exception(f"查询图像任务失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="查询图像任务失败")


# ========== 旧版接口保留兼容 ==========

@router.post("/generate")
async def generate_pet(data: PetGenerate):
    """AI 生成宠物形象（旧版，保留兼容）"""
    service = PetService()
    result = await service.generate_pet(data)
    return result


@router.get("/{pet_id}")
async def get_pet(pet_id: str):
    """获取宠物信息"""
    service = PetService()
    result = await service.get_pet(pet_id)
    if not result:
        raise HTTPException(status_code=404, detail="宠物不存在")
    return result


@router.post("/{pet_id}/feed")
async def feed_pet(pet_id: str, data: FeedRequest):
    """喂食"""
    service = PetService()
    result = await service.feed(pet_id, data.feed_type)
    return result


@router.post("/{pet_id}/heal")
async def heal_pet(pet_id: str, data: HealRequest):
    """治疗灰化症"""
    service = PetService()
    result = await service.heal(pet_id, data.heal_action)
    return result


@router.post("/{pet_id}/interact")
async def interact_pet(pet_id: str, data: InteractRequest):
    """互动"""
    service = PetService()
    result = await service.interact(pet_id, data.interaction_type)
    return result


@router.patch("/{pet_id}/style")
async def update_style(pet_id: str, data: StyleUpdate):
    """切换风格"""
    service = PetService()
    result = await service.update_style(pet_id, data.style)
    return result

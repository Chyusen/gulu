"""
咕噜 Gulu — 进化接口
对应 API 2/3/4/5/6
"""

import logging
from fastapi import APIRouter, Header, Depends
from typing import Optional
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.evolution import (
    PetStatsRequest, PetStatsData,
    FeedRequestV2, FeedData,
)
from app.services.evolution_service import EvolutionService

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_user_id_from_header(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Optional[str]:
    return x_user_id


# ========== API 2：进化判定 ==========

@router.get("/{pet_id}/evolution-check", response_model=ApiResponse)
async def evolution_check(pet_id: str) -> ApiResponse:
    """检查宠物是否可以进化"""
    service = EvolutionService()
    try:
        result = await service.check_evolution(pet_id)
        return ApiResponse.success(data=result)
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"进化判定失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="进化判定失败")


# ========== API 3：执行进化 ==========

@router.post("/{pet_id}/evolve", response_model=ApiResponse)
async def evolve_pet(pet_id: str) -> ApiResponse:
    """执行宠物进化"""
    service = EvolutionService()
    try:
        result = await service.evolve(pet_id)
        stage_names = {1: "萌芽体", 2: "成长体", 3: "灵魂体"}
        return ApiResponse.success(
            data=result,
            message=f"你的咕噜进化为{stage_names.get(result['current_stage'], '新形态')}！",
        )
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"执行进化失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="执行进化失败")


# ========== API 4：宠物数值更新 ==========

@router.post("/{pet_id}/stats", response_model=ApiResponse)
async def update_pet_stats(
    pet_id: str,
    data: PetStatsRequest,
) -> ApiResponse:
    """更新宠物三维数值"""
    service = EvolutionService()
    try:
        result = await service.update_stats(
            pet_id,
            stamina_delta=data.stamina_delta,
            intimacy_delta=data.intimacy_delta,
            energy_delta=data.energy_delta,
            reason=data.reason,
        )
        return ApiResponse.success(data=result)
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"更新宠物数值失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="更新宠物数值失败")


# ========== API 5：亲密度衰减计算 ==========

@router.get("/{pet_id}/intimacy-decay", response_model=ApiResponse)
async def intimacy_decay(pet_id: str) -> ApiResponse:
    """计算亲密度衰减"""
    service = EvolutionService()
    try:
        result = await service.calculate_intimacy_decay(pet_id)
        return ApiResponse.success(data=result)
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"计算亲密度衰减失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="计算亲密度衰减失败")


# ========== API 6：喂食（新版食物系统） ==========

@router.post("/{pet_id}/feed", response_model=ApiResponse)
async def feed_pet(
    pet_id: str,
    data: FeedRequestV2,
    user_id: Optional[str] = Depends(_get_user_id_from_header),
) -> ApiResponse:
    """喂食宠物（新版食物系统）"""
    service = EvolutionService()
    try:
        result = await service.feed_pet(
            pet_id,
            food_id=data.food_id,
            quantity=data.quantity,
            user_id=user_id,
        )
        return ApiResponse.success(data=result)
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"喂食失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="喂食失败")

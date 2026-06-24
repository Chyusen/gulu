"""
咕噜 Gulu — 货币接口
对应 API 7
"""

import logging
from fastapi import APIRouter
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.currency import CurrencyOperationRequest, CurrencyData
from app.services.currency_service import CurrencyService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{user_id}/currency", response_model=ApiResponse)
async def get_currency(user_id: str) -> ApiResponse:
    """获取用户货币余额"""
    service = CurrencyService()
    try:
        balance = await service.get_balance(user_id)
        return ApiResponse.success(data=CurrencyData(**balance))
    except Exception as e:
        logger.exception(f"获取货币余额失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取货币余额失败")


@router.post("/{user_id}/currency", response_model=ApiResponse)
async def operate_currency(
    user_id: str,
    data: CurrencyOperationRequest,
) -> ApiResponse:
    """货币操作（增加/消耗）"""
    service = CurrencyService()
    try:
        balance = await service.operate_currency(
            user_id=user_id,
            currency_type=data.currency_type,
            amount=data.amount,
            operation=data.operation,
            reason=data.reason,
        )
        return ApiResponse.success(data=CurrencyData(**balance))
    except ValueError as e:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message=str(e))
    except Exception as e:
        logger.exception(f"货币操作失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="货币操作失败")

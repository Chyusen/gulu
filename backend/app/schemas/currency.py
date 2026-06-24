"""
咕噜 Gulu — 货币 Pydantic 模型
对应 API 7：货币操作
"""

from typing import Literal
from pydantic import BaseModel, Field


class CurrencyOperationRequest(BaseModel):
    """货币操作请求"""
    currency_type: Literal["gulu_coin", "star_dust"]
    amount: int = Field(..., ge=1, description="金额，必须为正整数")
    operation: Literal["add", "spend"]
    reason: Literal["task_reward", "explore", "purchase", "recharge", "reshape", "feed", "activity"]


class CurrencyData(BaseModel):
    """货币余额数据"""
    gulu_coin: int
    star_dust: int

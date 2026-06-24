"""
咕噜 Gulu — 进化体系 Pydantic 模型
对应 API 2/3/4/5/6
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


# ========== API 2：进化判定 ==========

class RequirementItem(BaseModel):
    """单项进化条件"""
    current: float
    required: float
    met: bool


class EvolutionCheckData(BaseModel):
    """进化判定数据"""
    can_evolve: bool
    to_stage: int
    current_stage: int
    requirements: dict


# ========== API 3：执行进化 ==========

class EvolveData(BaseModel):
    """执行进化响应数据"""
    pet_id: str
    previous_stage: int
    current_stage: int
    unlocked: list
    new_limits: dict


# ========== API 4：宠物数值更新 ==========

class PetStatsRequest(BaseModel):
    """宠物数值更新请求"""
    stamina_delta: int = Field(default=0)
    intimacy_delta: int = Field(default=0)
    energy_delta: int = Field(default=0)
    reason: Literal["feed", "interact", "explore", "companion", "decay", "auto_explore"]


class PetStatsData(BaseModel):
    """宠物数值更新响应数据"""
    stamina: int
    max_stamina: int
    intimacy: int
    max_intimacy: int
    total_energy: int
    max_total_energy: int


# ========== API 5：亲密度衰减 ==========

class IntimacyDecayData(BaseModel):
    """亲密度衰减数据"""
    current_intimacy: float
    hours_since_interaction: float
    decay_amount: float
    new_intimacy: float
    decay_tier: Literal["none", "mild", "accelerated"]


# ========== API 6：喂食（新版食物系统） ==========

class FeedRequestV2(BaseModel):
    """喂食请求（新版）"""
    food_id: str
    quantity: int = Field(default=1, ge=1, le=99)


class FeedData(BaseModel):
    """喂食响应数据"""
    stamina_gained: int
    intimacy_gained: int
    is_preferred: bool
    preference_bonus: Optional[str] = None
    new_stamina: int
    new_intimacy: int
    gulu_coin_spent: int

"""
咕噜 Gulu — 任务 Pydantic 模型
对应 API 8/9/10
"""

from typing import Literal
from pydantic import BaseModel, Field


# ========== 每日任务 ==========

class DailyTaskItem(BaseModel):
    """每日任务项"""
    id: str
    type: Literal["chat", "feed", "explore", "companion", "social"]
    description: str
    current_progress: int
    target_progress: int
    reward: int
    is_completed: bool
    is_claimed: bool


class DailyTasksData(BaseModel):
    """每日任务数据"""
    tasks: list
    streak_days: int
    streak_bonus: float
    reset_at: str


# ========== 每周任务 ==========

class WeeklyTaskItem(BaseModel):
    """每周任务项"""
    id: str
    type: Literal["explore", "chat", "companion"]
    description: str
    current_progress: int
    target_progress: int
    base_reward: int
    is_completed: bool
    is_claimed: bool


class WeeklyTasksData(BaseModel):
    """每周任务数据"""
    tasks: list
    daily_completion_rate: float
    star_dust_multiplier: float
    reset_at: str


# ========== 任务进度更新与领取 ==========

class TaskProgressRequest(BaseModel):
    """任务进度更新请求"""
    progress_delta: int = Field(..., description="进度增量，可为负")


class TaskClaimData(BaseModel):
    """任务领取响应数据"""
    reward_type: str
    reward_amount: int
    new_balance: dict

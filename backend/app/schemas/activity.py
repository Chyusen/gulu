"""
咕噜 Gulu — 探索活动 Pydantic 模型
对应 API 11/12/13
"""

from typing import Optional, Literal, List
from pydantic import BaseModel, Field


# ========== API 11：散步/运动记录 ==========

class RoutePoint(BaseModel):
    """路线点"""
    lat: float
    lng: float
    timestamp: Optional[str] = None


class ActivityRequest(BaseModel):
    """散步/运动请求"""
    user_id: str
    activity_type: Literal["walk", "run", "citywalk"]
    duration_minutes: int = Field(..., ge=1, le=300)
    distance_meters: int = Field(default=0, ge=0)
    route_points: List[RoutePoint] = Field(default=[])


class ActivityData(BaseModel):
    """散步/运动响应数据"""
    stamina_cost: int
    energy_gained: int
    intimacy_gained: int
    gulu_coin_gained: int
    gulu_comment: str


# ========== API 12：室内陪伴活动 ==========

class CompanionRequest(BaseModel):
    """室内陪伴活动请求"""
    user_id: str
    activity_type: Literal["meditation", "pomodoro", "journal", "music"]
    duration_minutes: int = Field(..., ge=1, le=60)


class CompanionData(BaseModel):
    """室内陪伴活动响应数据"""
    energy_gained: int
    intimacy_gained: int
    stamina_cost: int
    gulu_comment: str


# ========== API 13：宠物自主探索 ==========

class AutoExploreStartRequest(BaseModel):
    """自主探索开始请求"""
    pet_id: str
    duration_hours: int = Field(..., ge=1, le=8)


class AutoExploreStartData(BaseModel):
    """自主探索开始响应数据"""
    estimated_stamina_cost: int
    started_at: str
    will_return_at: str


class AutoExploreCompleteRequest(BaseModel):
    """自主探索完成请求"""
    pet_id: str


class WhisperData(BaseModel):
    """咕噜悄悄话数据"""
    id: str
    story: str
    personality_tag: Literal["social", "solo"]


class AutoExploreCompleteData(BaseModel):
    """自主探索完成响应数据"""
    stamina_cost: int
    energy_gained: int
    gulu_coin_gained: int
    items_found: List[str] = []
    whisper: WhisperData


# ========== 小红书笔记 ==========

class XiaohongshuNoteItem(BaseModel):
    """小红书笔记项"""
    id: str
    title: str
    cover_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    distance: Optional[int] = None
    tags: List[str] = []

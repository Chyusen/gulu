"""
咕噜 Gulu — 好友系统 Pydantic 模型
对应 API 16
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


class FriendItem(BaseModel):
    """好友项"""
    user_id: str
    nickname: str
    pet_name: Optional[str] = None
    is_online: bool = False


class FriendsData(BaseModel):
    """好友列表数据"""
    friends: list


class AddFriendRequest(BaseModel):
    """添加好友请求"""
    target_user_id: str


class BlockRequest(BaseModel):
    """拉黑请求"""
    target_user_id: str


class ReportRequest(BaseModel):
    """举报请求"""
    target_user_id: str
    reason: Literal["harassment", "ad", "inappropriate", "other"]
    description: Optional[str] = Field(default=None, max_length=500)


class ExplorePrivacyRequest(BaseModel):
    """探索隐私设置请求"""
    show_gender: bool = False
    show_mbti: bool = False
    show_zodiac: bool = False


class ExplorePrivacyData(BaseModel):
    """探索隐私设置数据"""
    show_gender: bool
    show_mbti: bool
    show_zodiac: bool
    first_visit_done: bool

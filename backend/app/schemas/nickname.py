"""
咕噜 Gulu — 昵称审查 Pydantic 模型
对应 API 15
"""

from pydantic import BaseModel, Field


class NicknameCheckRequest(BaseModel):
    """昵称审查请求"""
    nickname: str = Field(..., min_length=1, max_length=50)


class NicknameCheckData(BaseModel):
    """昵称审查响应数据"""
    is_valid: bool
    reason: str

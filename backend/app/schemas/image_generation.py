"""
咕噜 Gulu — AI 图像生成 Schemas
对应 tech-plan-2026 方案三
"""

from typing import Optional
from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    """图像生成请求"""
    user_id: str = Field(..., description="用户 ID")
    type: str = Field("pet_avatar", description="生成类型：pet_avatar / pet_evolution / user_avatar / scene_illustration")
    style: str = Field("3d_cartoon", description="风格：3d_cartoon / 2d_anime / pixel_art / cyberpunk")
    custom_prompt: Optional[str] = Field(None, description="自定义 Prompt 补充")
    user_description: Optional[str] = Field(None, description="用户描述（用于头像定制）")


class ImageTaskData(BaseModel):
    """任务数据"""
    task_id: str = Field(..., description="任务 ID")


class ImageTaskStatus(BaseModel):
    """任务状态"""
    id: str
    user_id: Optional[str] = None
    type: Optional[str] = None
    style: Optional[str] = None
    status: str
    image_url: Optional[str] = None
    error_msg: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


class ImageQuotaData(BaseModel):
    """配额数据"""
    user_id: str
    used_count: int
    max_count: int
    reset_date: str

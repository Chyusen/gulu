"""
咕噜 Gulu — 宠物 Pydantic 模型
对应 API 2：POST /api/v1/pets/generate-image + GET /api/v1/pets/generate-image/{task_id}
对应 API 3：POST /api/v1/pets
"""

from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# 7 种视觉风格（与前端 StyleType 对齐）
PetStyle = Literal["anime", "realistic", "pixel", "scifi", "ink", "vaporwave", "sketch"]


# ========== API 2：AI 形象生成 ==========

class GenerateImageRequest(BaseModel):
    """AI 形象生成请求"""
    style: PetStyle = Field(..., description="视觉风格")
    custom_prompt: Optional[str] = Field(default=None, max_length=200, description="自定义描述词")
    mbti: Optional[str] = Field(default=None, description="用户 MBTI，用于微调 prompt")
    zodiac: Optional[str] = Field(default=None, description="用户星座，用于微调 prompt")


class GenerateImageResponse(BaseModel):
    """AI 形象生成响应（首次快速返回）"""
    code: int = 0
    data: "ImageTaskData"
    message: str = "生成任务已创建"


class ImageTaskStatus(BaseModel):
    """任务状态枚举（文档化用）"""
    status: Literal["pending", "generating", "completed", "failed"]


class ImageTaskData(BaseModel):
    """图像生成任务数据"""
    task_id: str
    status: Literal["pending", "generating", "completed", "failed"]
    image_url: Optional[str] = None
    prompt_used: Optional[str] = None
    error_msg: Optional[str] = None


class ImageTaskPollResponse(BaseModel):
    """轮询查询响应"""
    code: int = 0
    data: ImageTaskData
    message: str = "success"


# ========== API 3：创建宠物 ==========

class CreatePetRequest(BaseModel):
    """创建宠物请求"""
    name: str = Field(..., min_length=1, max_length=8, description="宠物名 1-8 字符")
    style: PetStyle = Field(..., description="视觉风格")
    custom_description: Optional[str] = Field(default=None, max_length=200)
    image_task_id: Optional[str] = Field(default=None, description="关联的图像生成任务 ID")


class PetData(BaseModel):
    """宠物数据"""
    id: str
    user_id: str
    name: str
    style: PetStyle
    personality_type: Optional[str] = None
    current_stage: str = "baby"
    stage_number: int = 1
    energy_level: int = 80
    max_energy: int = 100
    image_url: Optional[str] = None
    custom_description: Optional[str] = None
    action_closure_count: int = 0
    created_at: Optional[str] = None


class CreatePetResponse(BaseModel):
    """创建宠物响应"""
    code: int = 0
    data: PetData
    message: str = "宠物创建成功"


# 解决前向引用
GenerateImageResponse.model_rebuild()

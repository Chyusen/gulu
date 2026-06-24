"""
咕噜 Gulu — 用户画像接口
对应需求文档 5.1 用户画像接口
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.profile_service import ProfileService

router = APIRouter()


class ProfileCreate(BaseModel):
    mbti: str
    zodiac: str
    birth_date: Optional[str] = None
    nickname: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: str
    personality_analysis: str
    recommended_pet_traits: dict
    recommended_styles: list


@router.post("", response_model=ProfileResponse)
async def create_profile(data: ProfileCreate):
    """创建/更新用户画像"""
    service = ProfileService()
    result = await service.create_profile(data)
    return result


@router.get("/{user_id}")
async def get_profile(user_id: str):
    """获取用户画像"""
    service = ProfileService()
    result = await service.get_profile(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="用户不存在")
    return result


@router.patch("/{user_id}")
async def update_profile(user_id: str, data: dict):
    """更新用户信息"""
    service = ProfileService()
    result = await service.update_profile(user_id, data)
    return result

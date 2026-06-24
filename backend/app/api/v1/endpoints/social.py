"""咕噜 Gulu — 宠物社交接口"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.social_service import SocialService

router = APIRouter()


class NearbyRequest(BaseModel):
    lat: float
    lng: float
    radius: int = 500


class InteractRequest(BaseModel):
    pet_id: str
    target_pet_id: str
    interaction_type: str
    gift_id: Optional[str] = None


@router.post("/nearby")
async def nearby_pets(data: NearbyRequest):
    service = SocialService()
    return await service.discover_nearby(data)


@router.post("/interact")
async def interact(data: InteractRequest):
    service = SocialService()
    return await service.initiate_interaction(data)

"""咕噜 Gulu — 风格生成接口"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.style_service import StyleService

router = APIRouter()


class StyleGenerate(BaseModel):
    pet_id: str
    style: str
    custom_prompt: Optional[str] = None


@router.post("/generate")
async def generate_style(data: StyleGenerate):
    service = StyleService()
    return await service.generate(data)


@router.get("/recommend")
async def recommend_styles(mbti: str):
    service = StyleService()
    return await service.recommend(mbti)

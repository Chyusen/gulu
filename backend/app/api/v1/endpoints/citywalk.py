"""咕噜 Gulu — Citywalk 接口"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.citywalk_service import CitywalkService

router = APIRouter()


class StartWalk(BaseModel):
    user_id: str
    pet_id: str
    lat: float
    lng: float


class CheckIn(BaseModel):
    session_id: str
    lat: float
    lng: float
    poi_id: str


class EndWalk(BaseModel):
    session_id: str


@router.post("/start")
async def start_walk(data: StartWalk):
    service = CitywalkService()
    return await service.start(data)


@router.post("/checkin")
async def check_in(data: CheckIn):
    service = CitywalkService()
    return await service.checkin(data)


@router.post("/end")
async def end_walk(data: EndWalk):
    service = CitywalkService()
    return await service.end(data)

"""
咕噜 Gulu — 探索 Pydantic 模型
对应 API 4：GET /api/v1/explore/nearby
对应 API 5：POST /api/v1/explore/citywalk/guides
v3.0 新增：小红书笔记字段（API 14）
"""

from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ========== API 4：附近宠物/用户发现 ==========

class NearbyQuery(BaseModel):
    """附近发现查询参数"""
    lat: float = Field(..., ge=-90, le=90, description="纬度")
    lng: float = Field(..., ge=-180, le=180, description="经度")
    radius: int = Field(default=5000, ge=100, le=50000, description="搜索半径（米）")
    limit: int = Field(default=20, ge=1, le=100, description="返回数量上限")


class NearbyPetItem(BaseModel):
    """附近宠物项"""
    pet_id: str
    name: str
    style: str
    stage: str
    distance: int
    owner_nickname: str
    intro: str
    lat: float
    lng: float
    is_virtual: bool = False


class NearbyUserItem(BaseModel):
    """附近用户项（v3.0 对齐 API 14）"""
    user_id: str
    nickname: str
    mbti: Optional[str] = None
    distance: int
    lat: Optional[float] = None
    lng: Optional[float] = None
    # v3.0 API 14 新增字段
    pet_name: Optional[str] = None
    gender: Optional[str] = None
    zodiac: Optional[str] = None
    show_gender: bool = True
    show_mbti: bool = True
    show_zodiac: bool = True
    is_virtual: bool = False


class XiaohongshuNoteItem(BaseModel):
    """小红书笔记项（v3.0 API 14）"""
    id: str
    title: str
    cover_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    distance: Optional[int] = None
    tags: List[str] = []


class NearbyData(BaseModel):
    """附近发现数据（v3.0 对齐 API 14）"""
    pets: List[NearbyPetItem] = []
    users: List[NearbyUserItem] = []
    xiaohongshu_notes: List[XiaohongshuNoteItem] = []


class NearbyResponse(BaseModel):
    """附近发现响应"""
    code: int = 0
    data: NearbyData
    message: str = "success"


# ========== API 5：Citywalk 攻略 ==========

class CitywalkGuideRequest(BaseModel):
    """Citywalk 攻略请求"""
    mbti: str = Field(..., min_length=4, max_length=4, description="用户 MBTI")
    zodiac: str = Field(..., description="用户星座")
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    city: Optional[str] = Field(default=None, description="城市名，缺省时根据 lat/lng 逆地理推断")
    radius: int = Field(default=3000, ge=500, le=10000, description="POI 搜索半径（米）")
    limit: int = Field(default=3, ge=1, le=5, description="生成路线数量")

    @field_validator("mbti")
    @classmethod
    def validate_mbti(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 4:
            raise ValueError("MBTI 长度必须为 4 位")
        if v[0] not in ("E", "I"):
            raise ValueError("MBTI 第 1 位必须为 E 或 I")
        if v[1] not in ("S", "N"):
            raise ValueError("MBTI 第 2 位必须为 S 或 N")
        if v[2] not in ("F", "T"):
            raise ValueError("MBTI 第 3 位必须为 F 或 T")
        if v[3] not in ("J", "P"):
            raise ValueError("MBTI 第 4 位必须为 J 或 P")
        return v


class PoiItem(BaseModel):
    """POI 项"""
    name: str
    type: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    recommend_reason: str


class CitywalkGuide(BaseModel):
    """Citywalk 路线"""
    id: str
    title: str
    tags: List[str] = []
    summary: str
    duration: str
    distance: str
    pois: List[PoiItem] = []


class CitywalkGuidesData(BaseModel):
    """Citywalk 攻略数据"""
    guides: List[CitywalkGuide] = []
    city: Optional[str] = None
    cached: bool = False


class CitywalkGuidesResponse(BaseModel):
    """Citywalk 攻略响应"""
    code: int = 0
    data: CitywalkGuidesData
    message: str = "success"

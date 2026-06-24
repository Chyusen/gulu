"""
咕噜 Gulu — 用户画像 Pydantic 模型
对应 API 1：POST /api/v1/users/profile
v3.0 新增 gender 字段
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


# 12 星座枚举（白名单）
ZODIAC_LIST = [
    "白羊座", "金牛座", "双子座", "巨蟹座",
    "狮子座", "处女座", "天秤座", "天蝎座",
    "射手座", "摩羯座", "水瓶座", "双鱼座",
]
ZODIAC_SET = set(ZODIAC_LIST)

# 性别枚举
GENDER_VALUES = {"male", "female", "undisclosed"}


class ProfileSaveRequest(BaseModel):
    """保存用户画像请求"""
    nickname: Optional[str] = Field(default=None, min_length=1, max_length=12, description="用户昵称 1-12 字符")
    mbti: Optional[str] = Field(default=None, min_length=4, max_length=4, description="MBTI 4 字母")
    zodiac: Optional[str] = Field(default=None, description="星座，如 摩羯座")
    gender: Optional[str] = Field(default=None, description="性别 male|female|undisclosed")

    @field_validator("mbti")
    @classmethod
    def validate_mbti(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
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

    @field_validator("zodiac")
    @classmethod
    def validate_zodiac(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v not in ZODIAC_SET:
            raise ValueError(f"星座无效，必须为 {ZODIAC_LIST} 之一")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if v not in GENDER_VALUES:
            raise ValueError("gender 必须为 male、female 或 undisclosed")
        return v


class ProfileData(BaseModel):
    """用户画像数据"""
    id: str
    nickname: str
    mbti: str
    zodiac: str
    gender: Optional[str] = None


class ProfileResponse(BaseModel):
    """保存用户画像响应（统一格式）"""
    code: int = 0
    data: ProfileData
    message: str = "success"

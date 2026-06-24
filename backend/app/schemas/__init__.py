"""
咕噜 Gulu — Pydantic 模型聚合
对应后端 Agent 开发 Prompt：所有接口使用 Pydantic 模型校验
"""

from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.profile import ProfileSaveRequest, ProfileData, ProfileResponse
from app.schemas.pet import (
    PetStyle,
    GenerateImageRequest,
    GenerateImageResponse,
    ImageTaskStatus,
    ImageTaskData,
    ImageTaskPollResponse,
    CreatePetRequest,
    CreatePetResponse,
    PetData,
)
from app.schemas.explore import (
    NearbyQuery,
    NearbyPetItem,
    NearbyUserItem,
    NearbyData,
    NearbyResponse,
    CitywalkGuideRequest,
    PoiItem,
    CitywalkGuide,
    CitywalkGuidesData,
    CitywalkGuidesResponse,
)

__all__ = [
    # common
    "ApiResponse",
    "ErrorCode",
    # profile
    "ProfileSaveRequest",
    "ProfileData",
    "ProfileResponse",
    # pet
    "PetStyle",
    "GenerateImageRequest",
    "GenerateImageResponse",
    "ImageTaskStatus",
    "ImageTaskData",
    "ImageTaskPollResponse",
    "CreatePetRequest",
    "CreatePetResponse",
    "PetData",
    # explore
    "NearbyQuery",
    "NearbyPetItem",
    "NearbyUserItem",
    "NearbyData",
    "NearbyResponse",
    "CitywalkGuideRequest",
    "PoiItem",
    "CitywalkGuide",
    "CitywalkGuidesData",
    "CitywalkGuidesResponse",
]

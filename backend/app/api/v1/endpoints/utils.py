"""
咕噜 Gulu — 工具接口
对应 API 15：昵称审查
"""

from fastapi import APIRouter
from app.schemas.common import ApiResponse, ErrorCode
from app.schemas.nickname import NicknameCheckRequest, NicknameCheckData
from app.services.nickname_service import NicknameService

router = APIRouter()


@router.post("/nickname-check", response_model=ApiResponse)
async def nickname_check(data: NicknameCheckRequest) -> ApiResponse:
    """昵称合规审查"""
    service = NicknameService()
    try:
        result = service.check(data.nickname)
        return ApiResponse.success(data=NicknameCheckData(**result))
    except Exception as e:
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="昵称审查失败")

"""
咕噜 Gulu — 高德地图接口
对应 tech-plan-2026 方案二
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.common import ApiResponse, ErrorCode
from app.services.amap_service import AmapService
from app.services.location_service import LocationService

logger = logging.getLogger(__name__)
router = APIRouter()
_amap = AmapService()
_location = LocationService()


@router.get("/nearby", response_model=ApiResponse)
async def nearby_poi(
    location: str = Query(..., description="经度,纬度"),
    keywords: str = Query("", description="搜索关键词"),
    radius: int = Query(1000, description="搜索半径（米）"),
    page: int = Query(1, ge=1),
) -> ApiResponse:
    """周边 POI 搜索"""
    try:
        result = await _amap.search_nearby_poi(location, keywords, radius, page)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"POI 搜索失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="POI 搜索失败")


@router.get("/direction", response_model=ApiResponse)
async def direction(
    origin: str = Query(..., description="起点 经度,纬度"),
    destination: str = Query(..., description="终点 经度,纬度"),
    mode: str = Query("walking", description="模式：driving / walking / transit"),
) -> ApiResponse:
    """路线规划"""
    try:
        if mode not in ("driving", "walking", "transit"):
            return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message="mode 必须为 driving/walking/transit")
        result = await _amap.get_direction(origin, destination, mode)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"路线规划失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="路线规划失败")


@router.get("/regeo", response_model=ApiResponse)
async def regeo(location: str = Query(..., description="经度,纬度")) -> ApiResponse:
    """逆地理编码"""
    try:
        result = await _amap.regeo(location)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"逆地理编码失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="逆地理编码失败")


@router.get("/geocode", response_model=ApiResponse)
async def geocode(address: str = Query(..., description="地址")) -> ApiResponse:
    """地理编码"""
    try:
        result = await _amap.geocode(address)
        return ApiResponse.success(data=result)
    except Exception as e:
        logger.exception(f"地理编码失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="地理编码失败")


@router.post("/location", response_model=ApiResponse)
async def update_location(
    user_id: str,
    lng: float,
    lat: float,
) -> ApiResponse:
    """更新用户位置"""
    try:
        result = await _location.update_location(user_id, lng, lat)
        return ApiResponse.success(data=result, message="位置已更新")
    except Exception as e:
        logger.exception(f"更新位置失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="更新位置失败")


@router.get("/nearby-users", response_model=ApiResponse)
async def nearby_users(
    location: str = Query(..., description="经度,纬度"),
    radius: int = Query(1000, description="搜索半径（米）"),
    exclude_user_id: Optional[str] = Query(None, description="排除的用户 ID"),
) -> ApiResponse:
    """查询附近用户"""
    try:
        parts = location.split(",")
        if len(parts) != 2:
            return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message="location 格式应为 经度,纬度")
        lng, lat = float(parts[0]), float(parts[1])
        users = await _location.get_nearby_users(lng, lat, radius, exclude_user_id)
        return ApiResponse.success(data={"users": users, "total": len(users)})
    except ValueError:
        return ApiResponse.error(code=ErrorCode.INVALID_PARAM, message="坐标格式错误")
    except Exception as e:
        logger.exception(f"查询附近用户失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="查询附近用户失败")


@router.get("/location/{user_id}", response_model=ApiResponse)
async def get_user_location(user_id: str) -> ApiResponse:
    """获取用户位置"""
    try:
        loc = await _location.get_user_location(user_id)
        if not loc:
            return ApiResponse.error(code=ErrorCode.NOT_FOUND, message="用户位置不存在")
        return ApiResponse.success(data=loc)
    except Exception as e:
        logger.exception(f"获取用户位置失败: {e}")
        return ApiResponse.error(code=ErrorCode.INTERNAL_ERROR, message="获取用户位置失败")

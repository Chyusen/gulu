"""
咕噜 Gulu — 附近用户服务
对应 tech-plan-2026 方案二
基于 PostGIS 查询半径内用户
"""

import logging
from typing import Dict, Any, List, Optional
from app.core.database import get_supabase_safe, is_supabase_available

logger = logging.getLogger(__name__)

# 内存存储（Demo 降级）：南锣鼓巷 / 什刹海 / 鼓楼区域附近用户
_memory_locations: Dict[str, Dict[str, Any]] = {
    "demo_user_01": {"user_id": "demo_user_01", "lng": 116.3942, "lat": 39.9421},
    "demo_user_02": {"user_id": "demo_user_02", "lng": 116.3938, "lat": 39.9417},
    "demo_user_03": {"user_id": "demo_user_03", "lng": 116.3945, "lat": 39.9423},
    "demo_user_04": {"user_id": "demo_user_04", "lng": 116.3925, "lat": 39.9432},
    "demo_user_05": {"user_id": "demo_user_05", "lng": 116.3955, "lat": 39.9408},
    "demo_user_06": {"user_id": "demo_user_06", "lng": 116.3910, "lat": 39.9382},
    "demo_user_07": {"user_id": "demo_user_07", "lng": 116.3905, "lat": 39.9488},
    "demo_user_08": {"user_id": "demo_user_08", "lng": 116.3918, "lat": 39.9495},
    "demo_user_09": {"user_id": "demo_user_09", "lng": 116.3888, "lat": 39.9372},
    "demo_user_10": {"user_id": "demo_user_10", "lng": 116.3875, "lat": 39.9368},
    "demo_user_11": {"user_id": "demo_user_11", "lng": 116.3860, "lat": 39.9392},
    "demo_user_12": {"user_id": "demo_user_12", "lng": 116.3848, "lat": 39.9378},
    "demo_user_13": {"user_id": "demo_user_13", "lng": 116.3960, "lat": 39.9436},
    "demo_user_14": {"user_id": "demo_user_14", "lng": 116.3958, "lat": 39.9405},
    "demo_user_15": {"user_id": "demo_user_15", "lng": 116.3920, "lat": 39.9396},
}


class LocationService:
    """用户位置服务"""

    async def update_location(self, user_id: str, lng: float, lat: float) -> Dict[str, Any]:
        """更新用户位置"""
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                # upsert 到 user_locations 表（触发器会自动更新 geom）
                resp = (
                    supabase.table("user_locations")
                    .upsert({
                        "user_id": user_id,
                        "lng": lng,
                        "lat": lat,
                    })
                    .execute()
                )
                return {"user_id": user_id, "lng": lng, "lat": lat, "updated": True}
            except Exception as e:
                logger.warning(f"Supabase 更新位置失败，降级到内存: {e}")

        _memory_locations[user_id] = {
            "user_id": user_id,
            "lng": lng,
            "lat": lat,
        }
        return {"user_id": user_id, "lng": lng, "lat": lat, "updated": True}

    async def get_nearby_users(
        self,
        lng: float,
        lat: float,
        radius: int = 1000,
        exclude_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        查询半径内用户
        :param lng: 经度
        :param lat: 纬度
        :param radius: 半径（米）
        :param exclude_user_id: 排除的用户 ID
        """
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                # 使用 RPC 调用 PostGIS 查询
                rpc_result = supabase.rpc(
                    "find_nearby_users",
                    {
                        "p_lng": lng,
                        "p_lat": lat,
                        "p_radius": radius,
                        "p_exclude": exclude_user_id or "",
                    },
                ).execute()
                return rpc_result.data or []
            except Exception as e:
                logger.warning(f"Supabase PostGIS 查询失败，降级到内存: {e}")

        # 内存降级：使用 Haversine 公式
        return self._haversine_filter(lng, lat, radius, exclude_user_id)

    async def get_user_location(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户位置"""
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = (
                    supabase.table("user_locations")
                    .select("*")
                    .eq("user_id", user_id)
                    .execute()
                )
                if resp.data:
                    return resp.data[0]
                return None
            except Exception as e:
                logger.warning(f"Supabase 查询位置失败: {e}")
        return _memory_locations.get(user_id)

    def _haversine_filter(
        self,
        lng: float,
        lat: float,
        radius: int,
        exclude_user_id: Optional[str],
    ) -> List[Dict[str, Any]]:
        """内存降级：使用 Haversine 公式计算距离"""
        import math

        result = []
        for uid, loc in _memory_locations.items():
            if exclude_user_id and uid == exclude_user_id:
                continue
            distance = self._haversine(lat, lng, loc["lat"], loc["lng"])
            if distance <= radius:
                result.append({
                    "user_id": uid,
                    "lng": loc["lng"],
                    "lat": loc["lat"],
                    "distance": round(distance, 1),
                })
        return result

    @staticmethod
    def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """计算两点间距离（米）"""
        import math
        R = 6371000  # 地球半径（米）
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lng2 - lng1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

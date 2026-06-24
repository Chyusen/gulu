"""咕噜 Gulu — Citywalk 服务"""
import uuid
import logging
from datetime import datetime, timezone
import httpx
from typing import Optional
from fastapi import HTTPException
from app.core.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)


# 无 AMAP_KEY 时的 mock POI 数据
_MOCK_POIS = [
    {"id": "mock_poi_1", "name": "街角咖啡馆", "type": "餐饮", "distance": 120},
    {"id": "mock_poi_2", "name": "社区小公园", "type": "休闲", "distance": 280},
    {"id": "mock_poi_3", "name": "独立书店", "type": "文化", "distance": 350},
    {"id": "mock_poi_4", "name": "花艺工作室", "type": "购物", "distance": 420},
    {"id": "mock_poi_5", "name": "湖边步道", "type": "景观", "distance": 480},
]


class CitywalkService:
    async def start(self, data) -> dict:
        session_id = f"walk_{uuid.uuid4().hex[:12]}"
        try:
            supabase = get_supabase()
            supabase.table("citywalk_sessions").insert({
                "id": session_id,
                "user_id": data.user_id,
                "pet_id": data.pet_id,
                "start_lat": data.lat,
                "start_lng": data.lng,
                "status": "walking",
            }).execute()
        except Exception as e:
            logger.warning(f"启动 Citywalk 失败: {e}")

        return {
            "session_id": session_id,
            "pet_message": "Citywalk 开始！带着咕噜一起探索吧～",
            "nearby_pois": await self._get_nearby_pois(data.lat, data.lng),
        }

    async def checkin(self, data) -> dict:
        # 校验 session 存在性及状态
        session = await self._get_session(data.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Citywalk 会话不存在")
        if session.get("status") != "walking":
            raise HTTPException(status_code=400, detail="该 Citywalk 会话已结束，无法打卡")

        try:
            supabase = get_supabase()
            supabase.table("citywalk_checkins").insert({
                "id": f"checkin_{uuid.uuid4().hex[:8]}",
                "session_id": data.session_id,
                "poi_id": data.poi_id,
                "lat": data.lat,
                "lng": data.lng,
            }).execute()
        except Exception as e:
            logger.warning(f"打卡失败: {e}")

        return {
            "success": True,
            "message": "打卡成功！",
            "pet_message": "这里好有趣！谢谢你带我来～",
        }

    async def end(self, data) -> dict:
        # 校验 session 存在性及状态
        session = await self._get_session(data.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Citywalk 会话不存在")
        if session.get("status") != "walking":
            raise HTTPException(status_code=400, detail="该 Citywalk 会话已结束")

        ended_at = datetime.now(timezone.utc)
        started_at_str = session.get("started_at")
        duration_minutes = 0
        if started_at_str:
            try:
                # 兼容带时区和不带时区的时间字符串
                started_at = started_at_str
                if isinstance(started_at, str):
                    started_at = started_at.replace("Z", "+00:00")
                    started_at_dt = datetime.fromisoformat(started_at)
                    if started_at_dt.tzinfo is None:
                        started_at_dt = started_at_dt.replace(tzinfo=timezone.utc)
                    duration_minutes = int((ended_at - started_at_dt).total_seconds() // 60)
                    if duration_minutes < 0:
                        duration_minutes = 0
            except Exception as e:
                logger.warning(f"解析 started_at 失败: {e}")

        # 查询实际打卡记录数
        checkin_count = 0
        try:
            supabase = get_supabase()
            count_result = (
                supabase.table("citywalk_checkins")
                .select("id", count="exact")
                .eq("session_id", data.session_id)
                .execute()
            )
            checkin_count = count_result.count or 0
        except Exception as e:
            logger.warning(f"查询打卡记录失败: {e}")

        try:
            supabase = get_supabase()
            supabase.table("citywalk_sessions").update({
                "status": "completed",
                "ended_at": ended_at.isoformat(),
            }).eq("id", data.session_id).execute()
        except Exception as e:
            logger.warning(f"结束 Citywalk 失败: {e}")

        return {
            "session_id": data.session_id,
            "duration_minutes": duration_minutes,
            "checkin_count": checkin_count,
            "pet_summary": "今天和你一起散步好开心～下次还要一起出来玩！",
        }

    async def _get_session(self, session_id: str) -> Optional[dict]:
        """获取 session 信息"""
        try:
            supabase = get_supabase()
            result = (
                supabase.table("citywalk_sessions")
                .select("*")
                .eq("id", session_id)
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning(f"查询 session 失败: {e}")
        return None

    async def _get_nearby_pois(self, lat: float, lng: float) -> list:
        """通过高德地图 API 获取附近 POI"""
        if not settings.AMAP_API_KEY:
            # 无 API_KEY 时返回 mock POI 数据作为降级
            logger.info("未配置 AMAP_API_KEY，返回 mock POI 数据")
            return list(_MOCK_POIS)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.AMAP_API_URL}/place/around",
                    params={
                        "key": settings.AMAP_API_KEY,
                        "location": f"{lng},{lat}",
                        "radius": 500,
                        "types": "050000|060000|110000",
                        "offset": 10,
                    },
                )
                data = response.json()
                if data.get("pois"):
                    return [
                        {
                            "id": p.get("id"),
                            "name": p.get("name"),
                            "type": p.get("type"),
                            "distance": int(p.get("distance", 0)),
                        }
                        for p in data["pois"][:10]
                    ]
        except Exception as e:
            logger.warning(f"获取 POI 失败: {e}")
        return []

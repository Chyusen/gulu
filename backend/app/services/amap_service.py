"""
咕噜 Gulu — 高德地图服务
对应 tech-plan-2026 方案二
封装高德 Web 服务 API：POI 搜索、路线规划、逆地理编码
"""

import logging
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.redis import get_redis
from app.utils.http_retry import request_with_retry

logger = logging.getLogger(__name__)

# Redis 缓存 TTL（10 分钟）
CACHE_TTL = 600


class AmapService:
    """高德地图 Web 服务 API 封装"""

    async def search_nearby_poi(
        self,
        location: str,
        keywords: str = "",
        radius: int = 1000,
        page: int = 1,
        offset: int = 20,
    ) -> Dict[str, Any]:
        """
        周边 POI 搜索
        :param location: "经度,纬度"
        :param keywords: 搜索关键词
        :param radius: 搜索半径（米）
        """
        cache_key = f"amap:nearby:{location}:{keywords}:{radius}:{page}"
        cached = await self._get_cache(cache_key)
        if cached:
            return cached

        if not settings.AMAP_API_KEY:
            return self._mock_nearby(location, keywords, radius)

        params = {
            "key": settings.AMAP_API_KEY,
            "location": location,
            "keywords": keywords,
            "radius": radius,
            "offset": offset,
            "page": page,
            "extensions": "all",
        }
        resp = await request_with_retry(
            "GET",
            f"{settings.AMAP_API_URL}/place/around",
            params=params,
            timeout=10,
            retries=2,
        )
        if not resp:
            return self._mock_nearby(location, keywords, radius)

        data = resp.json()
        if data.get("status") != "1":
            logger.warning(f"高德 POI 搜索失败: {data.get('info')}")
            return self._mock_nearby(location, keywords, radius)

        result = {
            "pois": data.get("pois", []),
            "count": data.get("count", "0"),
        }
        await self._set_cache(cache_key, result)
        return result

    async def get_direction(
        self,
        origin: str,
        destination: str,
        mode: str = "walking",
    ) -> Dict[str, Any]:
        """
        路线规划
        :param origin: "经度,纬度"
        :param destination: "经度,纬度"
        :param mode: driving / walking / transit
        """
        cache_key = f"amap:direction:{mode}:{origin}:{destination}"
        cached = await self._get_cache(cache_key)
        if cached:
            return cached

        if not settings.AMAP_API_KEY:
            return self._mock_direction(origin, destination, mode)

        url_map = {
            "driving": "/direction/driving",
            "walking": "/direction/walking",
            "transit": "/direction/transit/integrated",
        }
        url_path = url_map.get(mode, "/direction/walking")
        params = {
            "key": settings.AMAP_API_KEY,
            "origin": origin,
            "destination": destination,
        }
        if mode == "transit":
            params["city"] = "全国"

        resp = await request_with_retry(
            "GET",
            f"{settings.AMAP_API_URL}{url_path}",
            params=params,
            timeout=10,
            retries=2,
        )
        if not resp:
            return self._mock_direction(origin, destination, mode)

        data = resp.json()
        if data.get("status") != "1":
            logger.warning(f"高德路线规划失败: {data.get('info')}")
            return self._mock_direction(origin, destination, mode)

        result = {"route": data.get("route", {}), "mode": mode}
        await self._set_cache(cache_key, result)
        return result

    async def regeo(self, location: str) -> Dict[str, Any]:
        """
        逆地理编码
        :param location: "经度,纬度"
        """
        cache_key = f"amap:regeo:{location}"
        cached = await self._get_cache(cache_key)
        if cached:
            return cached

        if not settings.AMAP_API_KEY:
            return self._mock_regeo(location)

        params = {
            "key": settings.AMAP_API_KEY,
            "location": location,
            "extensions": "base",
        }
        resp = await request_with_retry(
            "GET",
            f"{settings.AMAP_API_URL}/geocode/regeo",
            params=params,
            timeout=10,
            retries=2,
        )
        if not resp:
            return self._mock_regeo(location)

        data = resp.json()
        if data.get("status") != "1":
            logger.warning(f"高德逆地理编码失败: {data.get('info')}")
            return self._mock_regeo(location)

        result = data.get("regeocode", {})
        await self._set_cache(cache_key, result)
        return result

    async def geocode(self, address: str) -> Dict[str, Any]:
        """地理编码：地址转坐标"""
        if not settings.AMAP_API_KEY:
            return {"geocodes": []}

        params = {
            "key": settings.AMAP_API_KEY,
            "address": address,
        }
        resp = await request_with_retry(
            "GET",
            f"{settings.AMAP_API_URL}/geocode/geo",
            params=params,
            timeout=10,
            retries=2,
        )
        if not resp:
            return {"geocodes": []}

        data = resp.json()
        if data.get("status") != "1":
            return {"geocodes": []}

        return {"geocodes": data.get("geocodes", [])}

    # ========== 缓存 ==========

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        try:
            redis = await get_redis()
            data = await redis.get(key)
            if data:
                import json
                return json.loads(data)
        except Exception:
            pass
        return None

    async def _set_cache(self, key: str, value: Dict[str, Any]) -> None:
        try:
            redis = await get_redis()
            import json
            await redis.setex(key, CACHE_TTL, json.dumps(value, ensure_ascii=False))
        except Exception:
            pass

    # ========== 降级 Mock ==========

    def _mock_nearby(self, location: str, keywords: str, radius: int) -> Dict[str, Any]:
        """Demo 阶段 Mock：北京南锣鼓巷 / 什刹海 / 鼓楼区域 POI"""
        pois = [
            {"id": "nanluoguxiang_1", "name": "南锣鼓巷主街", "typecode": "110000", "address": "南锣鼓巷", "location": "116.3940,39.9420", "distance": "0"},
            {"id": "nanluoguxiang_2", "name": "文宇奶酪店", "typecode": "050000", "address": "南锣鼓巷", "location": "116.3935,39.9418", "distance": "50"},
            {"id": "nanluoguxiang_3", "name": "海小姐玫瑰饼", "typecode": "050000", "address": "南锣鼓巷", "location": "116.3942,39.9422", "distance": "40"},
            {"id": "nanluoguxiang_4", "name": "中央戏剧学院", "typecode": "140000", "address": "东棉花胡同", "location": "116.3950,39.9405", "distance": "180"},
            {"id": "nanluoguxiang_5", "name": "齐白石旧居纪念馆", "typecode": "160000", "address": "雨儿胡同", "location": "116.3928,39.9430", "distance": "150"},
            {"id": "nanluoguxiang_6", "name": "鼓楼", "typecode": "160000", "address": "鼓楼东大街", "location": "116.3905,39.9490", "distance": "850"},
            {"id": "nanluoguxiang_7", "name": "钟楼", "typecode": "160000", "address": "钟楼湾胡同", "location": "116.3915,39.9500", "distance": "950"},
            {"id": "nanluoguxiang_8", "name": "烟袋斜街", "typecode": "110000", "address": "烟袋斜街", "location": "116.3910,39.9380", "distance": "450"},
            {"id": "nanluoguxiang_9", "name": "什刹海酒吧街", "typecode": "080000", "address": "什刹海", "location": "116.3890,39.9370", "distance": "650"},
            {"id": "nanluoguxiang_10", "name": "前海", "typecode": "110000", "address": "什刹海", "location": "116.3875,39.9365", "distance": "800"},
            {"id": "nanluoguxiang_11", "name": "后海", "typecode": "110000", "address": "什刹海", "location": "116.3860,39.9390", "distance": "900"},
            {"id": "nanluoguxiang_12", "name": "恭王府", "typecode": "160000", "address": "前海西街", "location": "116.3845,39.9375", "distance": "1100"},
            {"id": "nanluoguxiang_13", "name": " Ravens 乌鸦咖啡", "typecode": "050400", "address": "鼓楼东大街", "location": "116.3915,39.9475", "distance": "650"},
            {"id": "nanluoguxiang_14", "name": "VOYAGE COFFEE", "typecode": "050400", "address": "南锣鼓巷", "location": "116.3945,39.9415", "distance": "80"},
            {"id": "nanluoguxiang_15", "name": "猫小院", "typecode": "050000", "address": "北锣鼓巷", "location": "116.3955,39.9440", "distance": "280"},
            {"id": "nanluoguxiang_16", "name": "Page One 书店", "typecode": "060000", "address": "南锣鼓巷", "location": "116.3930,39.9425", "distance": "120"},
            {"id": "nanluoguxiang_17", "name": "梅谭村", "typecode": "050000", "address": "南锣鼓巷", "location": "116.3948,39.9410", "distance": "150"},
            {"id": "nanluoguxiang_18", "name": "方砖厂69号炸酱面", "typecode": "050100", "address": "方砖厂胡同", "location": "116.3920,39.9395", "distance": "320"},
            {"id": "nanluoguxiang_19", "name": "菊儿人家", "typecode": "050100", "address": "菊儿胡同", "location": "116.3960,39.9435", "distance": "220"},
            {"id": "nanluoguxiang_20", "name": "Calm Yard 静谧小院", "typecode": "050400", "address": "帽儿胡同", "location": "116.3958,39.9408", "distance": "260"},
        ]
        # 根据关键词简单过滤
        if keywords:
            kw = keywords.lower()
            pois = [p for p in pois if kw in p["name"].lower() or kw in p["address"].lower()]
        return {"pois": pois, "count": str(len(pois)), "_mock": True}

    def _mock_direction(self, origin: str, destination: str, mode: str) -> Dict[str, Any]:
        return {
            "route": {
                "origin": origin,
                "destination": destination,
                "paths": [{"distance": "1000", "duration": "600"}],
            },
            "mode": mode,
            "_mock": True,
        }

    def _mock_regeo(self, location: str) -> Dict[str, Any]:
        return {
            "formatted_address": "示例地址",
            "addressComponent": {
                "province": "示例省",
                "city": "示例市",
                "district": "示例区",
            },
            "_mock": True,
        }

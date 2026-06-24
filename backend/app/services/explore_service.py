"""
咕噜 Gulu — 探索服务（v2.0 新增）
对应后端 Agent 开发 Prompt：
- API 4：GET /api/v1/explore/nearby 附近宠物/用户发现
- API 5：POST /api/v1/explore/citywalk/guides Citywalk 攻略检索
与需求文档 第五章 探索页对齐
v2.1 新增：使用 request_with_retry 实现外部 API 超时+重试
"""

import json
import math
import uuid
import logging
from typing import Optional, List, Tuple
from app.core.config import settings
from app.core.database import get_supabase, is_supabase_available
from app.core.redis import get_redis
from app.utils.http_retry import request_with_retry

logger = logging.getLogger(__name__)


# Haversine 公式计算两点距离（米）
def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


def _blur_location(value: float) -> float:
    """位置模糊化：保留 3 位小数（约 100m 精度）"""
    return round(value, 3)


# 虚拟宠物池（冷启动填充）
_VIRTUAL_PETS = [
    {
        "name": "星语",
        "style": "anime",
        "stage": "baby",
        "owner_nickname": "云朵上的猫",
        "intro": "一只喜欢在深夜思考人生的动漫小兽",
    },
    {
        "name": "墨墨",
        "style": "ink",
        "stage": "adult",
        "owner_nickname": "砚台",
        "intro": "水墨画里走出来的安静灵魂",
    },
    {
        "name": "霓霓",
        "style": "vaporwave",
        "stage": "baby",
        "owner_nickname": "复古少女",
        "intro": "蒸汽波里诞生的彩色梦境",
    },
    {
        "name": "皮卡",
        "style": "pixel",
        "stage": "divine",
        "owner_nickname": "8bit 老玩家",
        "intro": "16-bit 世界里的传奇勇者",
    },
    {
        "name": "赛博",
        "style": "scifi",
        "stage": "adult",
        "owner_nickname": "夜行程序员",
        "intro": "霓虹灯下闪烁的电子精灵",
    },
]


# 小红书笔记 Mock 数据池（v3.0 API 14）
_MOCK_XIAOHONGSHU_NOTES = [
    {
        "id": "note_1",
        "title": "这家咖啡馆太治愈了，待一下午都不想走",
        "cover_url": "https://placehold.co/600x400/FFE4B5/6B4EE6?text=Cafe",
        "tags": ["美食", "咖啡", "治愈"],
    },
    {
        "id": "note_2",
        "title": "藏在巷子里的独立书店，灵魂被治愈了",
        "cover_url": "https://placehold.co/600x400/E6E6FA/6B4EE6?text=Bookstore",
        "tags": ["文化", "书店", "安静"],
    },
    {
        "id": "note_3",
        "title": "周末Citywalk路线分享｜老城区漫步",
        "cover_url": "https://placehold.co/600x400/B0E0E6/6B4EE6?text=Citywalk",
        "tags": ["旅行", "Citywalk", "老街"],
    },
    {
        "id": "note_4",
        "title": "湖边日落绝佳机位，拍照超出片",
        "cover_url": "https://placehold.co/600x400/FFB6C1/6B4EE6?text=Sunset",
        "tags": ["摄影", "日落", "湖景"],
    },
    {
        "id": "note_5",
        "title": "本地人私藏的早茶店，排队也值得",
        "cover_url": "https://placehold.co/600x400/FFF8DC/6B4EE6?text=Food",
        "tags": ["美食", "早茶", "本地"],
    },
    {
        "id": "note_6",
        "title": "周末花艺工作坊体验，治愈一整天",
        "cover_url": "https://placehold.co/600x400/DDA0DD/6B4EE6?text=Flower",
        "tags": ["生活", "花艺", "手作"],
    },
]


class ExploreService:
    """探索服务：附近发现 + Citywalk 攻略"""

    # ========== API 4：附近宠物/用户发现 ==========

    async def discover_nearby(
        self,
        lat: float,
        lng: float,
        radius: int = 5000,
        limit: int = 20,
        current_user_id: Optional[str] = None,
    ) -> dict:
        """
        发现附近的宠物/用户。
        - 使用 Haversine 公式计算距离。
        - 排除当前用户自己的宠物/账号。
        - 位置精度模糊化为 3 位小数。
        - 返回结果按距离升序。
        - 冷启动时补充虚拟宠物（标记 is_virtual=True）。
        """
        pets: List[dict] = []
        users: List[dict] = []

        if is_supabase_available():
            try:
                supabase = get_supabase()
                # 联表查询宠物 + 位置 + 用户
                result = (
                    supabase.table("pets")
                    .select(
                        "id, name, style, current_stage, user_id, "
                        "pet_locations(lat, lng, is_visible), "
                        "users(id, nickname, mbti, privacy_level)"
                    )
                    .limit(100)
                    .execute()
                )
                rows = result.data or []
                for pet in rows:
                    loc = pet.get("pet_locations")
                    if isinstance(loc, list):
                        loc = loc[0] if loc else None
                    if not loc or not loc.get("is_visible", True):
                        continue
                    user_info = pet.get("users")
                    if isinstance(user_info, list):
                        user_info = user_info[0] if user_info else {}
                    # 隐私过滤
                    if user_info and user_info.get("privacy_level", 1) >= 3:
                        continue
                    # 排除自己
                    if current_user_id and pet.get("user_id") == current_user_id:
                        continue
                    pet_lat = loc.get("lat", 0.0)
                    pet_lng = loc.get("lng", 0.0)
                    distance = _haversine_meters(lat, lng, pet_lat, pet_lng)
                    if distance > radius:
                        continue
                    stage_int = pet.get("current_stage", 1)
                    stage_map = {1: "baby", 2: "adult", 3: "divine"}
                    pets.append({
                        "pet_id": pet.get("id"),
                        "name": pet.get("name", "咕噜"),
                        "style": pet.get("style", "anime"),
                        "stage": stage_map.get(stage_int, "baby"),
                        "distance": int(distance),
                        "owner_nickname": (user_info or {}).get("nickname", "咕噜主人"),
                        "intro": "一只神秘的灵魂伙伴",
                        "lat": _blur_location(pet_lat),
                        "lng": _blur_location(pet_lng),
                        "is_virtual": False,
                    })
                    # 同时收集用户
                    if user_info and user_info.get("id"):
                        user_record = {
                            "user_id": user_info["id"],
                            "nickname": user_info.get("nickname", "咕噜主人"),
                            "mbti": user_info.get("mbti"),
                            "gender": user_info.get("gender"),
                            "zodiac": user_info.get("zodiac"),
                            "pet_name": pet.get("name", "咕噜"),
                            "distance": int(distance),
                            "lat": _blur_location(pet_lat),
                            "lng": _blur_location(pet_lng),
                            "is_virtual": False,
                        }
                        users.append(user_record)
            except Exception as e:
                logger.warning(f"查询附近宠物失败: {e}")

        # 冷启动：真实数据不足时补充虚拟宠物
        if len(pets) < 3:
            needed = 3 - len(pets)
            for i, vp in enumerate(_VIRTUAL_PETS[:needed]):
                v_lat = lat + (i + 1) * 0.001  # 偏移约 100m
                v_lng = lng + (i + 1) * 0.001
                v_distance = int(_haversine_meters(lat, lng, v_lat, v_lng))
                pets.append({
                    "pet_id": f"virtual_{uuid.uuid4().hex[:8]}",
                    "name": vp["name"],
                    "style": vp["style"],
                    "stage": vp["stage"],
                    "distance": v_distance,
                    "owner_nickname": vp["owner_nickname"],
                    "intro": vp["intro"],
                    "lat": _blur_location(v_lat),
                    "lng": _blur_location(v_lng),
                    "is_virtual": True,
                })

        # 去重用户
        seen_user_ids = set()
        unique_users = []
        for u in users:
            if u["user_id"] not in seen_user_ids:
                seen_user_ids.add(u["user_id"])
                unique_users.append(u)

        # 排序 + 截断
        pets.sort(key=lambda x: x["distance"])
        unique_users.sort(key=lambda x: x["distance"])

        # v3.0 API 14：应用探索隐私设置过滤展示字段
        unique_users = await self._apply_privacy_filter(unique_users)

        # v3.0 API 14：补充小红书笔记 Mock 数据
        xiaohongshu_notes = self._build_mock_xiaohongshu_notes(lat, lng, limit)

        return {
            "pets": pets[:limit],
            "users": unique_users[:limit],
            "xiaohongshu_notes": xiaohongshu_notes,
        }

    async def _apply_privacy_filter(self, users: List[dict]) -> List[dict]:
        """
        v3.0 API 14：根据每个用户的 explore_privacy 设置过滤展示字段。
        - show_gender=False → gender 置 None
        - show_mbti=False → mbti 置 None
        - show_zodiac=False → zodiac 置 None
        - 同时返回 show_* 标志，便于前端展示
        """
        if not users:
            return users

        # 批量获取隐私设置
        privacy_map: dict = {}
        if is_supabase_available():
            try:
                supabase = get_supabase()
                user_ids = [u["user_id"] for u in users]
                result = (
                    supabase.table("explore_privacy")
                    .select("user_id, show_gender, show_mbti, show_zodiac")
                    .in_("user_id", user_ids)
                    .execute()
                )
                for row in result.data or []:
                    privacy_map[row["user_id"]] = row
            except Exception as e:
                logger.warning(f"批量获取隐私设置失败: {e}")

        filtered = []
        for u in users:
            privacy = privacy_map.get(u["user_id"], {})
            show_gender = privacy.get("show_gender", True)
            show_mbti = privacy.get("show_mbti", True)
            show_zodiac = privacy.get("show_zodiac", True)

            filtered.append({
                **u,
                "gender": u.get("gender") if show_gender else None,
                "mbti": u.get("mbti") if show_mbti else None,
                "zodiac": u.get("zodiac") if show_zodiac else None,
                "show_gender": show_gender,
                "show_mbti": show_mbti,
                "show_zodiac": show_zodiac,
            })
        return filtered

    def _build_mock_xiaohongshu_notes(
        self,
        lat: float,
        lng: float,
        limit: int = 20,
    ) -> List[dict]:
        """
        生成小红书笔记 Mock 数据（v3.0 API 14）。
        - 围绕请求坐标附近随机分布。
        - 位置模糊化为 3 位小数。
        - 按距离升序返回。
        """
        notes: List[dict] = []
        for i, note in enumerate(_MOCK_XIAOHONGSHU_NOTES):
            # 在请求点附近 50~500m 范围内分布
            offset_lat = (i + 1) * 0.0005 + (i % 3) * 0.0002
            offset_lng = (i + 1) * 0.0004 + (i % 2) * 0.0003
            note_lat = lat + offset_lat
            note_lng = lng + offset_lng
            distance = int(_haversine_meters(lat, lng, note_lat, note_lng))
            notes.append({
                "id": note["id"],
                "title": note["title"],
                "cover_url": note["cover_url"],
                "lat": _blur_location(note_lat),
                "lng": _blur_location(note_lng),
                "distance": distance,
                "tags": note["tags"],
            })
        notes.sort(key=lambda x: x["distance"])
        return notes[:limit]

    # ========== API 5：Citywalk 攻略 ==========

    async def get_citywalk_guides(
        self,
        mbti: str,
        zodiac: str,
        lat: float,
        lng: float,
        city: Optional[str] = None,
        radius: int = 3000,
        limit: int = 3,
    ) -> dict:
        """
        生成 Citywalk 攻略。
        - 真实 POI 检索（高德 API）。
        - AI 攻略生成（DeepSeek）。
        - Redis 缓存 24 小时。
        - 降级方案：高德失败用默认 POI；DeepSeek 失败用简洁路线。
        """
        # 1. 推断城市
        if not city:
            city = await self._reverse_geocode_city(lat, lng) or "未知城市"

        # 2. 查缓存
        cache_key = f"citywalk:{mbti}:{zodiac}:{city}:{_blur_location(lat)}:{_blur_location(lng)}"
        cached = await self._get_cache(cache_key)
        if cached:
            cached["cached"] = True
            return cached

        # 3. 真实 POI 检索
        pois = await self._search_pois(lat, lng, radius)
        if not pois:
            pois = self._default_pois()

        # 4. AI 攻略生成
        guides = await self._generate_guides_with_deepseek(
            mbti=mbti,
            zodiac=zodiac,
            city=city,
            pois=pois,
            limit=limit,
        )

        # 5. 降级：DeepSeek 失败时用简洁路线
        if not guides:
            guides = self._build_simple_guides(mbti, zodiac, city, pois, limit)

        result = {
            "guides": guides,
            "city": city,
            "cached": False,
        }

        # 6. 写缓存（24 小时）
        await self._set_cache(cache_key, result, ttl=86400)
        return result

    async def _reverse_geocode(self, lat: float, lng: float) -> Optional[dict]:
        """高德逆地理编码（超时5s，重试2次）"""
        if not settings.AMAP_API_KEY:
            return None
        try:
            resp = await request_with_retry(
                "GET",
                f"{settings.AMAP_API_URL}/geocode/regeo",
                params={
                    "key": settings.AMAP_API_KEY,
                    "location": f"{lng},{lat}",
                    "extensions": "base",
                },
                timeout=5,
                retries=2,
            )
            if resp:
                data = resp.json()
                return data.get("regeocode")
        except Exception as e:
            logger.warning(f"逆地理编码失败: {e}")
        return None

    async def _reverse_geocode_city(self, lat: float, lng: float) -> Optional[str]:
        """获取城市名"""
        regeo = await self._reverse_geocode(lat, lng)
        if not regeo:
            return None
        addr = regeo.get("addressComponent", {})
        city = addr.get("city") or addr.get("province") or None
        if isinstance(city, list):
            city = city[0] if city else None
        if city in ("", []):
            city = None
        return city

    async def _search_pois(self, lat: float, lng: float, radius: int) -> List[dict]:
        """
        通过高德地图 API 搜索附近 POI。
        关键词组合：书店、咖啡馆、美术馆、公园、老街、美食街。
        超时5s，重试2次。
        """
        if not settings.AMAP_API_KEY:
            return []

        keywords = ["书店", "咖啡馆", "美术馆", "公园", "老街", "美食街"]
        all_pois: List[dict] = []
        seen_ids = set()

        try:
            for kw in keywords:
                if len(all_pois) >= 15:
                    break
                resp = await request_with_retry(
                    "GET",
                    f"{settings.AMAP_API_URL}/place/around",
                    params={
                        "key": settings.AMAP_API_KEY,
                        "location": f"{lng},{lat}",
                        "radius": radius,
                        "keywords": kw,
                        "offset": 5,
                    },
                    timeout=5,
                    retries=2,
                )
                if not resp:
                    continue
                data = resp.json()
                for p in data.get("pois", []) or []:
                    poi_id = p.get("id") or p.get("name")
                    if poi_id in seen_ids:
                        continue
                    seen_ids.add(poi_id)
                    # 解析 POI 经纬度
                    p_location = p.get("location", "")
                    p_lat, p_lng = None, None
                    if p_location and "," in p_location:
                        parts = p_location.split(",")
                        if len(parts) == 2:
                            p_lng, p_lat = parts
                            try:
                                p_lat = float(p_lat)
                                p_lng = float(p_lng)
                            except (TypeError, ValueError):
                                p_lat, p_lng = None, None
                    all_pois.append({
                        "name": p.get("name", ""),
                        "type": p.get("type", ""),
                        "address": p.get("address", ""),
                        "lat": p_lat,
                        "lng": p_lng,
                        "distance": int(p.get("distance", 0) or 0),
                    })
        except Exception as e:
            logger.warning(f"高德 POI 检索失败: {e}")

        return all_pois[:15]

    def _default_pois(self) -> List[dict]:
        """降级 POI 列表"""
        return [
            {"name": "街角咖啡馆", "type": "餐饮", "address": "", "lat": None, "lng": None, "distance": 120},
            {"name": "社区小公园", "type": "休闲", "address": "", "lat": None, "lng": None, "distance": 280},
            {"name": "独立书店", "type": "文化", "address": "", "lat": None, "lng": None, "distance": 350},
            {"name": "花艺工作室", "type": "购物", "address": "", "lat": None, "lng": None, "distance": 420},
            {"name": "湖边步道", "type": "景观", "address": "", "lat": None, "lng": None, "distance": 480},
        ]

    async def _generate_guides_with_deepseek(
        self,
        mbti: str,
        zodiac: str,
        city: str,
        pois: List[dict],
        limit: int,
    ) -> List[dict]:
        """
        调用 DeepSeek 生成 Citywalk 路线。
        失败时返回空列表，由调用方降级处理。
        """
        if not settings.DEEPSEEK_API_KEY:
            return []

        # 构造 POI 列表文本
        poi_lines = []
        for i, p in enumerate(pois, 1):
            poi_lines.append(f"{i}. {p['name']}（{p.get('type', '')}）- {p.get('address', '')}")
        poi_text = "\n".join(poi_lines)

        prompt = (
            f"用户画像：MBTI={mbti}，星座={zodiac}，位置={city}。\n"
            f"请根据以下附近 POI 列表，生成 {limit} 条适合该画像的 Citywalk 路线。\n"
            f"要求：\n"
            f"- 路线氛围与用户画像匹配\n"
            f"- 包含吃、喝、玩、乐中的至少两类\n"
            f"- 每条路线 3-5 个 POI\n"
            f"- 用温柔的口吻写推荐理由\n"
            f"- 严格输出 JSON 数组，每个元素结构：\n"
            f'  {{"title": "...", "tags": ["..."], "summary": "...", '
            f'"duration": "2.5h", "distance": "3.2km", '
            f'"pois": [{{"name": "...", "type": "...", "address": "...", "recommend_reason": "..."}}]}}\n\n'
            f"POI 列表：\n{poi_text}"
        )

        try:
            resp = await request_with_retry(
                "POST",
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": "你是咕噜，一只温柔的灵魂宠物，擅长为主人规划 Citywalk 路线。只输出 JSON。"},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.8,
                    "max_tokens": 2000,
                    "thinking": {"type": "disabled"},
                },
                timeout=30,
                retries=2,
            )
            if resp:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                guides = self._parse_deepseek_response(content, pois)
                return guides[:limit]
        except Exception as e:
            logger.warning(f"DeepSeek 生成攻略失败: {e}")
        return []

    def _parse_deepseek_response(self, content: str, fallback_pois: List[dict]) -> List[dict]:
        """解析 DeepSeek 返回的 JSON 内容"""
        # 尝试直接解析
        try:
            data = json.loads(content)
            if isinstance(data, list):
                return [self._normalize_guide(g, fallback_pois) for g in data]
        except json.JSONDecodeError:
            pass

        # 尝试提取 JSON 数组
        import re
        match = re.search(r"\[\s*\{.*\}\s*\]", content, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
                return [self._normalize_guide(g, fallback_pois) for g in data]
            except json.JSONDecodeError:
                pass
        return []

    def _normalize_guide(self, g: dict, fallback_pois: List[dict]) -> dict:
        """规范化单条攻略"""
        guide_id = str(uuid.uuid4())
        pois = []
        for p in g.get("pois", []) or []:
            pois.append({
                "name": p.get("name", ""),
                "type": p.get("type", ""),
                "address": p.get("address", ""),
                "lat": None,
                "lng": None,
                "recommend_reason": p.get("recommend_reason", ""),
            })
        # 若 POI 为空，使用 fallback
        if not pois and fallback_pois:
            for fp in fallback_pois[:3]:
                pois.append({
                    "name": fp.get("name", ""),
                    "type": fp.get("type", ""),
                    "address": fp.get("address", ""),
                    "lat": fp.get("lat"),
                    "lng": fp.get("lng"),
                    "recommend_reason": "适合本次路线的氛围",
                })
        return {
            "id": guide_id,
            "title": g.get("title", "未命名路线"),
            "tags": g.get("tags", []) or [],
            "summary": g.get("summary", ""),
            "duration": g.get("duration", "2h"),
            "distance": g.get("distance", "3km"),
            "pois": pois,
        }

    def _build_simple_guides(
        self,
        mbti: str,
        zodiac: str,
        city: str,
        pois: List[dict],
        limit: int,
    ) -> List[dict]:
        """降级方案：无 AI 包装的简洁路线"""
        # 根据 MBTI 推断氛围
        if mbti.startswith("I"):
            mood = "安静独处"
            tags_default = ["静", "思考"]
        else:
            mood = "热闹活力"
            tags_default = ["活力", "社交"]

        guides = []
        for i in range(min(limit, max(1, len(pois) // 3))):
            start = i * 3
            selected = pois[start:start + 3]
            if not selected:
                break
            guide_pois = [
                {
                    "name": p.get("name", ""),
                    "type": p.get("type", ""),
                    "address": p.get("address", ""),
                    "lat": p.get("lat"),
                    "lng": p.get("lng"),
                    "recommend_reason": f"适合{mbti}的{mood}氛围",
                }
                for p in selected
            ]
            guides.append({
                "id": str(uuid.uuid4()),
                "title": f"{mbti} {zodiac} 的{mood}路线 {i + 1}",
                "tags": tags_default + [p.get("type", "") for p in selected[:2]],
                "summary": f"这是一条适合 {mbti} {zodiac} 在{city}的{mood}路线。",
                "duration": "2h",
                "distance": "2.5km",
                "pois": guide_pois,
            })
        return guides

    # ========== Redis 缓存 ==========

    async def _get_cache(self, key: str) -> Optional[dict]:
        try:
            redis = await get_redis()
            data = await redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"读取缓存失败: {e}")
        return None

    async def _set_cache(self, key: str, value: dict, ttl: int = 86400) -> None:
        try:
            redis = await get_redis()
            await redis.setex(key, ttl, json.dumps(value, ensure_ascii=False))
        except Exception as e:
            logger.warning(f"写入缓存失败: {e}")

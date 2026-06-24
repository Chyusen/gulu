"""咕噜 Gulu — 宠物社交服务"""
import math
import uuid
import logging
from datetime import datetime, timezone, timedelta
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# 每天对同一宠物最多互动次数
MAX_DAILY_INTERACTIONS_PER_PET = 3


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """使用 Haversine 公式计算两点间距离（米）"""
    R = 6371000.0  # 地球半径（米）
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


class SocialService:
    async def discover_nearby(self, data) -> dict:
        """发现附近的宠物"""
        try:
            supabase = get_supabase()
            # 联表查询宠物 + 位置 + 用户（昵称）
            result = (
                supabase.table("pets")
                .select(
                    "id, name, style, current_stage, user_id, "
                    "pet_locations(lat, lng, is_visible), "
                    "users(nickname, privacy_level)"
                )
                .limit(50)
                .execute()
            )
            pets = result.data or []
        except Exception as e:
            logger.warning(f"发现附近宠物失败: {e}")
            return {"nearby_pets": [], "radius": data.radius}

        nearby = []
        for pet in pets:
            loc = pet.get("pet_locations")
            # pet_locations 可能是 dict 或 list（取决于关联类型）
            if isinstance(loc, list):
                loc = loc[0] if loc else None
            if not loc:
                continue
            # 隐私过滤：不可见或用户隐私等级为 3（最高）则跳过
            if not loc.get("is_visible", True):
                continue
            user_info = pet.get("users")
            if isinstance(user_info, list):
                user_info = user_info[0] if user_info else {}
            if user_info and user_info.get("privacy_level", 1) >= 3:
                continue
            # 距离过滤
            distance = _haversine_meters(
                data.lat, data.lng, loc.get("lat", 0.0), loc.get("lng", 0.0)
            )
            if distance > data.radius:
                continue
            nearby.append({
                "pet_id": pet.get("id"),
                "name": pet.get("name"),
                "style": pet.get("style"),
                "stage": pet.get("current_stage"),
                "distance": int(distance),
                "owner_nickname": (user_info or {}).get("nickname", "咕噜主人"),
            })

        # 按距离升序
        nearby.sort(key=lambda x: x["distance"])
        return {
            "nearby_pets": nearby,
            "radius": data.radius,
        }

    async def initiate_interaction(self, data) -> dict:
        """发起互动"""
        # 防骚扰：每天对同一宠物最多 3 次互动
        try:
            supabase = get_supabase()
            now = datetime.now(timezone.utc)
            today_start = now - timedelta(hours=24)
            count_result = (
                supabase.table("pet_social")
                .select("id", count="exact")
                .eq("pet_id", data.pet_id)
                .eq("target_pet_id", data.target_pet_id)
                .gte("created_at", today_start.isoformat())
                .execute()
            )
            today_count = count_result.count or 0
            if today_count >= MAX_DAILY_INTERACTIONS_PER_PET:
                return {
                    "success": False,
                    "interaction_result": None,
                    "both_pets_response": None,
                    "message": f"今天已对该宠物发起 {today_count} 次互动，请明天再试",
                }
        except Exception as e:
            logger.warning(f"查询互动次数失败: {e}")

        interaction_id = f"interact_{uuid.uuid4().hex[:8]}"
        try:
            supabase = get_supabase()
            supabase.table("pet_social").insert({
                "id": interaction_id,
                "pet_id": data.pet_id,
                "target_pet_id": data.target_pet_id,
                "interaction_type": data.interaction_type,
                "gift_type": data.gift_id,
            }).execute()
        except Exception as e:
            logger.warning(f"社交互动失败: {e}")

        interaction_result = {
            "interaction_id": interaction_id,
            "interaction_type": data.interaction_type,
            "gift_id": data.gift_id,
        }
        both_pets_response = {
            "from_pet_message": "你的咕噜开心地打了招呼～",
            "to_pet_message": "你好呀！很高兴认识你～",
        }
        return {
            "success": True,
            "interaction_result": interaction_result,
            "both_pets_response": both_pets_response,
        }

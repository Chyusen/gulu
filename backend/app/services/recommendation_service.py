"""
咕噜 Gulu — 推荐服务
对应 tech-plan-2026 方案一
基于 MBTI + 星座画像的 RAG 向量检索推荐 + 基于位置的实时 AI 推荐
"""

import json
import hashlib
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.database import get_supabase_safe, is_supabase_available
from app.core.redis import get_redis
from app.utils.http_retry import request_with_retry

logger = logging.getLogger(__name__)

# MBTI 描述映射
MBTI_DESCRIPTIONS = {
    "INTJ": "理性、独立、有远见，喜欢深度思考",
    "INTP": "逻辑性强、好奇、善于分析",
    "ENTJ": "果断、有领导力、目标导向",
    "ENTP": "创新、灵活、喜欢挑战",
    "INFJ": "理想主义、有同理心、追求意义",
    "INFP": "敏感、理想化、追求和谐",
    "ENFJ": "热情、有感染力、关心他人",
    "ENFP": "热情、有创意、善于社交",
    "ISTJ": "严谨、可靠、注重细节",
    "ISFJ": "温和、尽责、有耐心",
    "ESTJ": "务实、有条理、善于管理",
    "ESFJ": "友善、合作、关心他人感受",
    "ISTP": "冷静、灵活、善于动手",
    "ISFP": "温和、敏感、有艺术气质",
    "ESTP": "活跃、务实、喜欢冒险",
    "ESFP": "热情、随和、享受当下",
}

# 星座描述映射
ZODIAC_DESCRIPTIONS = {
    "白羊座": "热情冲动、勇敢直率",
    "金牛座": "稳重固执、享受生活",
    "双子座": "好奇多变、善于沟通",
    "巨蟹座": "敏感温柔、重视家庭",
    "狮子座": "自信大方、有领导力",
    "处女座": "完美主义、注重细节",
    "天秤座": "优雅和谐、追求平衡",
    "天蝎座": "深沉神秘、意志坚定",
    "射手座": "乐观自由、热爱冒险",
    "摩羯座": "务实上进、有责任感",
    "水瓶座": "独立创新、理想主义",
    "双鱼座": "浪漫敏感、富有想象力",
}

# 内存存储（Demo 降级）：南锣鼓巷 / 什刹海 / 鼓楼区域推荐内容
_memory_contents: List[Dict[str, Any]] = [
    {"platform": "xhs", "external_id": "rec_01", "title": "南锣鼓巷 Citywalk 路线｜半天逛完老北京", "summary": "从南锣鼓巷主街出发，穿过雨儿胡同看齐白石旧居，再去北锣鼓巷喝咖啡，人少又出片。", "tags": ["南锣鼓巷", "citywalk", "北京"], "likes": 1250, "location": "116.3940,39.9420", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_02", "title": "什刹海日落攻略｜北京最浪漫的傍晚", "summary": "傍晚五点从前海开始，沿着湖边走到银锭桥，等一场橘子海日落，附近酒吧街氛围很好。", "tags": ["什刹海", "日落", "北京"], "likes": 2300, "location": "116.3875,39.9365", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_03", "title": "鼓楼拍照机位大公开", "summary": "鼓楼东大街的红墙和路牌是经典机位，建议早上九点去，光线柔和且人少。", "tags": ["鼓楼", "拍照", "北京"], "likes": 1890, "location": "116.3905,39.9490", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_04", "title": "南锣鼓巷小吃红黑榜", "summary": "文宇奶酪、海小姐玫瑰饼、方砖厂炸酱面值得一试，网红芝士榴莲饼排队久且一般。", "tags": ["南锣鼓巷", "小吃", "北京"], "likes": 980, "location": "116.3935,39.9418", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_05", "title": "烟袋斜街 10 分钟漫步指南", "summary": "从鼓楼拐进烟袋斜街，一路走到银锭桥，小店很多但不建议买，适合拍照。", "tags": ["烟袋斜街", "漫步", "北京"], "likes": 760, "location": "116.3910,39.9380", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_06", "title": "恭王府半日游｜一座恭王府半部清朝史", "summary": "提前预约门票，重点看锡晋斋和大戏楼，建议请讲解或租电子导览。", "tags": ["恭王府", "历史", "北京"], "likes": 1450, "location": "116.3845,39.9375", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_07", "title": "北锣鼓巷咖啡地图", "summary": "避开南锣主街的人流，北锣鼓巷的独立咖啡馆更适合安静坐一下午。", "tags": ["北锣鼓巷", "咖啡", "北京"], "likes": 540, "location": "116.3955,39.9440", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_08", "title": "后海夜景｜北京夏日限定浪漫", "summary": "晚上九点后海边的灯光亮起，沿着湖边散步很凉快，酒吧街热闹但选店需谨慎。", "tags": ["后海", "夜景", "北京"], "likes": 1120, "location": "116.3860,39.9390", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_09", "title": "南锣鼓巷隐藏胡同｜帽儿胡同", "summary": "帽儿胡同有达贝子府旧址，游客少，青砖灰瓦很出片，适合慢逛。", "tags": ["帽儿胡同", "南锣鼓巷", "北京"], "likes": 430, "location": "116.3958,39.9408", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_10", "title": "方砖厂 69 号炸酱面测评", "summary": "老北京炸酱面，菜码丰富，人均 30，错峰去不用排队，腊八蒜免费。", "tags": ["炸酱面", "南锣鼓巷", "北京"], "likes": 890, "location": "116.3920,39.9395", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_11", "title": "菊儿人家｜南锣附近的胡同家常菜", "summary": "藏在菊儿胡同里的小馆子，卤肉饭和炸酱面都不错，老板很热情。", "tags": ["菊儿胡同", "家常菜", "北京"], "likes": 320, "location": "116.3960,39.9435", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_12", "title": "中央戏剧学院｜东城文艺地标", "summary": "东棉花胡同里的中戏实验剧场，常有学生演出，门口拍照很有氛围。", "tags": ["中戏", "东棉花胡同", "北京"], "likes": 670, "location": "116.3950,39.9405", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_13", "title": "VOYAGE COFFEE 南锣店", "summary": "极简风咖啡馆，手冲不错，门口有棵大树，春天坐在户外很舒服。", "tags": ["咖啡", "南锣鼓巷", "北京"], "likes": 510, "location": "116.3945,39.9415", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_14", "title": "钟楼｜被忽略的北京中轴线", "summary": "鼓楼对面就是钟楼，登楼视野很好，可以买钟鼓楼联票一起逛。", "tags": ["钟楼", "中轴线", "北京"], "likes": 780, "location": "116.3915,39.9500", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_15", "title": "南锣鼓巷书店巡礼", "summary": "主街上的独立书店和文创店很好逛，Page One 有精选书籍和明信片。", "tags": ["书店", "南锣鼓巷", "北京"], "likes": 410, "location": "116.3930,39.9425", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_16", "title": "什刹海划船攻略", "summary": "夏天可以租脚踏船或电动船，四人脚踏船 120/小时，傍晚最舒服。", "tags": ["什刹海", "划船", "北京"], "likes": 1560, "location": "116.3875,39.9365", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_17", "title": "银锭桥｜什刹海最佳观景点", "summary": "站在银锭桥上可以看到西山晴雪，秋天黄昏时分尤其美。", "tags": ["银锭桥", "什刹海", "北京"], "likes": 620, "location": "116.3880,39.9375", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_18", "title": "老北京胡同里的猫小院", "summary": "北锣鼓巷的猫主题咖啡馆，猫咪亲人，适合爱猫人士歇脚。", "tags": ["猫咖", "北锣鼓巷", "北京"], "likes": 930, "location": "116.3955,39.9440", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_19", "title": "齐白石旧居纪念馆｜免费参观", "summary": "雨儿胡同里的小院子，介绍齐白石晚年生活，不用预约，周一闭馆。", "tags": ["齐白石", "纪念馆", "北京"], "likes": 580, "location": "116.3928,39.9430", "cover_url": ""},
    {"platform": "xhs", "external_id": "rec_20", "title": "鼓楼东大街｜老北京与新潮流碰撞", "summary": "一边是鼓楼一边是南锣，街道两旁有很多古着店、唱片店和独立咖啡。", "tags": ["鼓楼东大街", "探店", "北京"], "likes": 840, "location": "116.3915,39.9475", "cover_url": ""},
]


class RecommendationService:
    """推荐服务"""

    async def recommend_contents(
        self,
        user_id: str,
        top_k: int = 5,
        mbti: Optional[str] = None,
        zodiac: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        基于用户画像推荐内容
        1. 获取用户画像（MBTI + 星座）
        2. 生成画像向量
        3. 向量相似度检索
        4. DeepSeek 生成推荐语
        """
        # 获取用户画像
        profile = await self._get_user_profile(user_id, mbti, zodiac)
        if not profile.get("mbti") and not profile.get("zodiac"):
            # 画像不完整时降级：使用默认画像 + 随机内容
            profile = {"user_id": user_id, "mbti": "INFP", "zodiac": "双鱼座"}

        # 生成画像描述文本
        profile_text = self._build_profile_text(profile["mbti"], profile["zodiac"])
        logger.info(f"用户 {user_id} 画像: {profile_text}")

        # 生成画像向量
        profile_embedding = await self._generate_embedding(profile_text)

        # 向量检索
        contents = await self._vector_search(profile_embedding, top_k * 2)

        # 如果向量检索无结果，降级到随机
        if not contents:
            contents = await self._get_random_contents(top_k)

        # 截取 top_k
        contents = contents[:top_k]

        # DeepSeek 生成推荐语
        recommendations = await self._generate_reasons(profile, contents)

        return {
            "recommendations": recommendations,
            "profile": {
                "mbti": profile.get("mbti"),
                "zodiac": profile.get("zodiac"),
                "description": profile_text,
            },
        }

    async def _get_user_profile(
        self,
        user_id: str,
        mbti: Optional[str],
        zodiac: Optional[str],
    ) -> Dict[str, Any]:
        """获取用户画像"""
        if mbti and zodiac:
            return {"user_id": user_id, "mbti": mbti, "zodiac": zodiac}

        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = (
                    supabase.table("users")
                    .select("mbti, zodiac")
                    .eq("id", user_id)
                    .execute()
                )
                if resp.data:
                    return {
                        "user_id": user_id,
                        "mbti": resp.data[0].get("mbti") or mbti,
                        "zodiac": resp.data[0].get("zodiac") or zodiac,
                    }
            except Exception as e:
                logger.warning(f"获取用户画像失败: {e}")

        return {"user_id": user_id, "mbti": mbti, "zodiac": zodiac}

    def _build_profile_text(self, mbti: Optional[str], zodiac: Optional[str]) -> str:
        """构建用户画像描述文本"""
        parts = []
        if mbti:
            mbti_desc = MBTI_DESCRIPTIONS.get(mbti.upper(), "独特个性")
            parts.append(f"{mbti} 用户，{mbti_desc}")
        if zodiac:
            zodiac_desc = ZODIAC_DESCRIPTIONS.get(zodiac, "")
            parts.append(f"{zodiac}，{zodiac_desc}")
        parts.append("喜欢城市漫步、艺术氛围和小众打卡点")
        return "，".join(parts)

    async def _generate_embedding(self, text: str) -> List[float]:
        """使用 BGE-m3 生成向量"""
        if not settings.SILICONFLOW_API_KEY:
            return []

        try:
            resp = await request_with_retry(
                "POST",
                "https://api.siliconflow.cn/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "BAAI/bge-m3",
                    "input": text,
                },
                timeout=30,
                retries=2,
            )
            if resp:
                data = resp.json()
                return data.get("data", [{}])[0].get("embedding", [])
        except Exception as e:
            logger.warning(f"生成向量失败: {e}")
        return []

    async def _vector_search(self, embedding: List[float], top_k: int) -> List[Dict[str, Any]]:
        """向量相似度检索"""
        if not embedding:
            return []

        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                # 使用 RPC 调用 pgvector 检索
                embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
                resp = supabase.rpc(
                    "match_contents",
                    {
                        "p_embedding": embedding_str,
                        "p_top_k": top_k,
                    },
                ).execute()
                return resp.data or []
            except Exception as e:
                logger.warning(f"向量检索失败: {e}")

        # 内存降级：返回随机内容
        return _memory_contents[:top_k]

    async def _get_random_contents(self, limit: int) -> List[Dict[str, Any]]:
        """随机获取内容（降级）"""
        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                resp = (
                    supabase.table("content_items")
                    .select("*")
                    .order("created_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                return resp.data or []
            except Exception as e:
                logger.warning(f"获取内容失败: {e}")
        return _memory_contents[:limit]

    async def _generate_reasons(
        self,
        profile: Dict[str, Any],
        contents: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """使用 DeepSeek 生成推荐语"""
        if not contents:
            return []

        if not settings.DEEPSEEK_API_KEY:
            # 降级：使用模板生成推荐语
            return [
                {
                    "content": c,
                    "score": 0.85,
                    "reason": f"基于你是{profile.get('mbti', '')}{profile.get('zodiac', '')}，这条内容可能适合你",
                }
                for c in contents
            ]

        try:
            profile_text = self._build_profile_text(profile.get("mbti"), profile.get("zodiac"))
            contents_text = "\n".join(
                f"{i+1}. {c.get('title', '')}: {c.get('summary', '')[:100]}"
                for i, c in enumerate(contents)
            )

            prompt = (
                f"用户画像：{profile_text}\n\n"
                f"推荐内容列表：\n{contents_text}\n\n"
                f"请为每条内容生成一句个性化推荐语（不超过30字），"
                f"说明为什么适合这个用户。格式：编号. 推荐语"
            )

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
                        {"role": "system", "content": "你是一个个性化推荐助手，擅长根据用户画像推荐内容。"},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 800,
                    "thinking": {"type": "disabled"},
                },
                timeout=30,
                retries=2,
            )

            reasons_text = ""
            if resp:
                data = resp.json()
                reasons_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # 解析推荐语
            reasons = self._parse_reasons(reasons_text, len(contents))

            return [
                {
                    "content": c,
                    "score": 0.85 + 0.01 * i,
                    "reason": reasons[i] if i < len(reasons) else "推荐内容",
                }
                for i, c in enumerate(contents)
            ]
        except Exception as e:
            logger.warning(f"DeepSeek 生成推荐语失败: {e}")
            return [
                {
                    "content": c,
                    "score": 0.85,
                    "reason": f"基于你的画像推荐",
                }
                for c in contents
            ]

    @staticmethod
    def _parse_reasons(text: str, count: int) -> List[str]:
        """解析 DeepSeek 返回的推荐语"""
        lines = text.strip().split("\n")
        reasons = []
        for line in lines:
            # 去掉编号前缀
            parts = line.split(".", 1)
            if len(parts) == 2:
                reasons.append(parts[1].strip())
            elif line.strip():
                reasons.append(line.strip())
        return reasons[:count]

    # ========== 基于位置的实时 AI 推荐 ==========

    async def recommend_by_location(
        self,
        user_id: str,
        location: str,
        mbti: Optional[str] = None,
        zodiac: Optional[str] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        基于用户当前位置的实时 AI 推荐
        1. 检查 Redis 缓存（30 分钟）
        2. 调用高德 API 获取附近 POI
        3. 调用 DeepSeek 生成个性化推荐语
        4. 缓存结果
        """
        # 1. 检查缓存
        cache_key = self._location_cache_key(user_id, location, mbti)
        cached = await self._get_cache(cache_key)
        if cached:
            cached["_cached"] = True
            return cached

        # 2. 获取附近 POI
        from app.services.amap_service import AmapService
        amap = AmapService()

        try:
            poi_result = await amap.search_nearby_poi(location, "", 1000, 1)
            pois = poi_result.get("pois", [])[:top_k * 2]
        except Exception as e:
            logger.warning(f"POI 搜索失败: {e}")
            pois = []

        # 3. 逆地理编码获取位置名
        try:
            regeo_result = await amap.regeo(location)
            location_name = regeo_result.get("formatted_address", "当前位置")
        except Exception:
            location_name = "当前位置"

        # 4. 如果没有 POI，返回空
        if not pois:
            return {
                "recommendations": [],
                "location": location_name,
                "source": "高德地图 · AI 个性化推荐",
                "message": "附近暂无推荐地点",
            }

        # 5. DeepSeek 生成个性化推荐
        recommendations = await self._generate_location_recommendations(
            mbti, zodiac, location_name, pois, top_k
        )

        result = {
            "recommendations": recommendations,
            "location": location_name,
            "source": "高德地图 · AI 个性化推荐",
        }

        # 6. 缓存 30 分钟
        await self._set_cache(cache_key, result, 1800)

        return result

    async def _generate_location_recommendations(
        self,
        mbti: Optional[str],
        zodiac: Optional[str],
        location_name: str,
        pois: List[Dict[str, Any]],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """使用 DeepSeek 基于位置和 MBTI 生成个性化推荐"""

        # 构建用户画像描述
        profile_parts = []
        if mbti:
            mbti_desc = MBTI_DESCRIPTIONS.get(mbti.upper(), "独特个性")
            profile_parts.append(f"MBTI: {mbti}（{mbti_desc}）")
        if zodiac:
            zodiac_desc = ZODIAC_DESCRIPTIONS.get(zodiac, "")
            profile_parts.append(f"星座: {zodiac}（{zodiac_desc}）")
        profile_text = "，".join(profile_parts) if profile_parts else "通用用户"

        # 构建 POI 列表文本
        poi_list_text = "\n".join(
            f"{i+1}. {p.get('name', '未知地点')} - {p.get('address', '')} - 距离 {p.get('distance', '未知')}m"
            for i, p in enumerate(pois[:top_k * 2])
        )

        # 如果没有 DeepSeek API Key，降级
        if not settings.DEEPSEEK_API_KEY:
            return [
                {
                    "content": {
                        "platform": "amap",
                        "external_id": f"poi_{i}",
                        "title": p.get("name", "未知地点"),
                        "summary": p.get("address", ""),
                        "tags": ["高德地图"],
                        "likes": 0,
                        "location": p.get("location", ""),
                    },
                    "score": 0.85,
                    "reason": f"基于你的画像推荐",
                }
                for i, p in enumerate(pois[:top_k])
            ]

        try:
            prompt = (
                f"你是一个个性化推荐助手。根据用户的性格和当前位置，为附近的地点生成个性化推荐语。\n\n"
                f"用户画像：{profile_text}\n"
                f"当前位置：{location_name}\n\n"
                f"附近地点：\n{poi_list_text}\n\n"
                f"请为每个地点生成一句个性化推荐语（不超过50字），"
                f"说明为什么这个地点适合这个用户。格式：\n"
                f"编号. 推荐语\n"
                f"只输出推荐语，不要重复地点名。"
            )

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
                        {"role": "system", "content": "你是一个个性化推荐助手，擅长根据用户性格和位置推荐附近地点。"},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.8,
                    "thinking": {"type": "disabled"},
                },
                timeout=30,
                retries=2,
            )

            reasons_text = ""
            if resp:
                data = resp.json()
                reasons_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            reasons = self._parse_reasons(reasons_text, len(pois[:top_k]))

            return [
                {
                    "content": {
                        "platform": "amap",
                        "external_id": f"poi_{i}",
                        "title": p.get("name", "未知地点"),
                        "summary": p.get("address", ""),
                        "tags": ["高德地图"],
                        "likes": 0,
                        "location": p.get("location", ""),
                    },
                    "score": 0.85 + 0.01 * i,
                    "reason": reasons[i] if i < len(reasons) else "推荐地点",
                }
                for i, p in enumerate(pois[:top_k])
            ]
        except Exception as e:
            logger.warning(f"DeepSeek 位置推荐生成失败: {e}")
            return [
                {
                    "content": {
                        "platform": "amap",
                        "external_id": f"poi_{i}",
                        "title": p.get("name", "未知地点"),
                        "summary": p.get("address", ""),
                        "tags": ["高德地图"],
                        "likes": 0,
                        "location": p.get("location", ""),
                    },
                    "score": 0.85,
                    "reason": "推荐地点",
                }
                for i, p in enumerate(pois[:top_k])
            ]

    # ========== 缓存工具 ==========

    @staticmethod
    def _location_cache_key(user_id: str, location: str, mbti: Optional[str]) -> str:
        """生成位置缓存 key"""
        location_hash = hashlib.md5(f"{location}:{mbti or ''}".encode()).hexdigest()[:8]
        return f"rec_loc:{user_id}:{location_hash}"

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """从 Redis 获取缓存"""
        try:
            redis = await get_redis()
            data = await redis.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    async def _set_cache(self, key: str, value: Dict[str, Any], ttl: int = 1800) -> None:
        """设置 Redis 缓存"""
        try:
            redis = await get_redis()
            await redis.setex(key, ttl, json.dumps(value, ensure_ascii=False))
        except Exception:
            pass

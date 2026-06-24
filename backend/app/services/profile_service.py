"""
咕噜 Gulu — 用户画像服务
对应需求文档 2.4 画像结果
v2.0 新增 save_profile 方法（对齐 API 1）
v2.1 新增：Supabase 未配置时的内存降级方案（demo 模式）
"""

import uuid
import logging
from typing import Optional
from app.core.config import settings
from app.core.database import get_supabase, get_supabase_safe, is_supabase_available

logger = logging.getLogger(__name__)

# demo 模式内存存储（Supabase 未配置时使用）
_mock_users: dict = {}

# MBTI 分析数据（与前端保持一致）
MBTI_ANALYSIS = {
    "INFP": {"analysis": "你是理想主义的调停者，内心温柔而深邃。", "strengths": ["共情能力强", "富有创造力"], "growth": ["容易陷入内耗"]},
    "INFJ": {"analysis": "你是深邃的倡导者，洞察人心。", "strengths": ["直觉敏锐", "有远见"], "growth": ["容易精疲力竭"]},
    "INTP": {"analysis": "你是理性的思考者，热爱探索理论。", "strengths": ["逻辑思维强", "好奇心旺盛"], "growth": ["情感表达较弱"]},
    "INTJ": {"analysis": "你是独立的建筑师，善于构建系统。", "strengths": ["战略思维", "独立自主"], "growth": ["情感沟通较弱"]},
    "ISFP": {"analysis": "你是温柔的艺术家，用感官感受世界。", "strengths": ["审美敏锐", "温和善良"], "growth": ["容易回避冲突"]},
    "ISFJ": {"analysis": "你是温暖的守护者，默默付出。", "strengths": ["忠诚可靠", "细心体贴"], "growth": ["不善表达需求"]},
    "ISTP": {"analysis": "你是灵巧的鉴赏家，擅长动手解决。", "strengths": ["动手能力强", "冷静理性"], "growth": ["情感表达不足"]},
    "ISTJ": {"analysis": "你是严谨的物流师，重视秩序。", "strengths": ["责任心强", "条理清晰"], "growth": ["不够灵活"]},
    "ENFP": {"analysis": "你是热情的竞选者，充满灵感。", "strengths": ["热情洋溢", "富有创意"], "growth": ["容易分心"]},
    "ENFJ": {"analysis": "你是温暖的主人公，善于引导。", "strengths": ["富有感染力", "善于引导"], "growth": ["过度在意他人评价"]},
    "ENTP": {"analysis": "你是机敏的辩论家，热爱思辨。", "strengths": ["思维敏捷", "善于辩论"], "growth": ["容易争辩"]},
    "ENTJ": {"analysis": "你是果断的指挥官，天生的领导者。", "strengths": ["领导力强", "决断力强"], "growth": ["情感表达不足"]},
    "ESFP": {"analysis": "你是活力的表演者，热爱生活。", "strengths": ["热情开朗", "善于社交"], "growth": ["长期规划较弱"]},
    "ESFJ": {"analysis": "你是温暖的执政官，关心他人。", "strengths": ["热心助人", "善于照顾他人"], "growth": ["过度在意他人看法"]},
    "ESTP": {"analysis": "你是大胆的企业家，行动派。", "strengths": ["行动力强", "善于应变"], "growth": ["缺乏耐心"]},
    "ESTJ": {"analysis": "你是务实的总经理，重视效率。", "strengths": ["组织能力强", "务实高效"], "growth": ["情感表达不足"]},
}

MBTI_STYLE_RECOMMENDATIONS = {
    "INFP": ["anime", "ink", "sketch"],
    "INFJ": ["ink", "anime", "sketch"],
    "INTP": ["scifi", "pixel", "sketch"],
    "INTJ": ["scifi", "ink", "realistic"],
    "ISFP": ["anime", "vaporwave", "sketch"],
    "ISFJ": ["anime", "realistic", "sketch"],
    "ISTP": ["realistic", "pixel", "scifi"],
    "ISTJ": ["realistic", "pixel", "ink"],
    "ENFP": ["vaporwave", "anime", "sketch"],
    "ENFJ": ["anime", "vaporwave", "realistic"],
    "ENTP": ["scifi", "vaporwave", "pixel"],
    "ENTJ": ["scifi", "realistic", "ink"],
    "ESFP": ["vaporwave", "anime", "sketch"],
    "ESFJ": ["anime", "realistic", "vaporwave"],
    "ESTP": ["realistic", "pixel", "vaporwave"],
    "ESTJ": ["realistic", "pixel", "ink"],
}

MBTI_PET_TRAITS = {
    "INFP": {"personality_type": "dreamer", "description": "温柔的理想主义者"},
    "INFJ": {"personality_type": "mystic", "description": "深邃的灵魂伴侣"},
    "INTP": {"personality_type": "thinker", "description": "好奇的探索者"},
    "INTJ": {"personality_type": "strategist", "description": "睿智的伙伴"},
    "ISFP": {"personality_type": "artist", "description": "敏感的艺术家"},
    "ISFJ": {"personality_type": "guardian", "description": "温柔的守护者"},
    "ISTP": {"personality_type": "craftsman", "description": "灵巧的匠人"},
    "ISTJ": {"personality_type": "keeper", "description": "可靠的守护者"},
    "ENFP": {"personality_type": "spark", "description": "热情的小火苗"},
    "ENFJ": {"personality_type": "guide", "description": "温暖的引路人"},
    "ENTP": {"personality_type": "debater", "description": "机敏的辩论家"},
    "ENTJ": {"personality_type": "commander", "description": "果敢的领袖"},
    "ESFP": {"personality_type": "performer", "description": "活力四射的表演者"},
    "ESFJ": {"personality_type": "host", "description": "热心的主人"},
    "ESTP": {"personality_type": "adventurer", "description": "勇敢的冒险家"},
    "ESTJ": {"personality_type": "manager", "description": "务实的管家"},
}


class ProfileService:
    async def save_profile(self, data, user_id: Optional[str] = None) -> dict:
        """
        保存用户画像（v2.0 API 1：POST /api/v1/users/profile）。
        v3.0 新增 gender 字段。
        - 若 user_id 已存在则 upsert 更新；否则新建用户。
        - 校验由 Pydantic 模型完成，这里只负责持久化。
        - Supabase 未配置时使用内存降级（demo 模式）。
        """
        nickname = data.nickname
        mbti = data.mbti
        zodiac = data.zodiac
        gender = data.gender

        # demo 模式：Supabase 未配置时使用内存存储
        if not is_supabase_available():
            return self._mock_save_profile(nickname, mbti, zodiac, user_id, gender)

        try:
            supabase = get_supabase()
            if user_id:
                # 更新已有用户
                update_fields = {}
                if nickname is not None:
                    update_fields["nickname"] = nickname
                if mbti is not None:
                    update_fields["mbti"] = mbti
                if zodiac is not None:
                    update_fields["zodiac"] = zodiac
                if gender is not None:
                    update_fields["gender"] = gender

                result = (
                    supabase.table("users")
                    .update(update_fields)
                    .eq("id", user_id)
                    .execute()
                )
                if result.data:
                    return {
                        "id": result.data[0]["id"],
                        "nickname": result.data[0].get("nickname", nickname or ""),
                        "mbti": result.data[0].get("mbti", mbti or ""),
                        "zodiac": result.data[0].get("zodiac", zodiac or ""),
                        "gender": result.data[0].get("gender", gender),
                    }
                # 没找到记录则走新建流程
            # 新建用户
            new_id = user_id or f"user_{uuid.uuid4().hex[:16]}"
            insert_data = {
                "id": new_id,
                "privacy_level": 2,
                "is_minor": False,
            }
            if nickname is not None:
                insert_data["nickname"] = nickname
            if mbti is not None:
                insert_data["mbti"] = mbti
            if zodiac is not None:
                insert_data["zodiac"] = zodiac
            if gender is not None:
                insert_data["gender"] = gender

            supabase.table("users").upsert(insert_data).execute()
            return {
                "id": new_id,
                "nickname": nickname or "",
                "mbti": mbti or "",
                "zodiac": zodiac or "",
                "gender": gender,
            }
        except Exception as e:
            logger.exception(f"保存用户画像失败，降级到内存模式: {e}")
            return self._mock_save_profile(nickname, mbti, zodiac, user_id, gender)

    def _mock_save_profile(
        self,
        nickname: str,
        mbti: str,
        zodiac: str,
        user_id: Optional[str] = None,
        gender: Optional[str] = None,
    ) -> dict:
        """demo 模式：内存存储用户画像"""
        new_id = user_id or f"user_{uuid.uuid4().hex[:16]}"
        _mock_users[new_id] = {
            "id": new_id,
            "nickname": nickname,
            "mbti": mbti,
            "zodiac": zodiac,
            "gender": gender,
        }
        logger.info(f"[demo 模式] 用户画像已保存到内存: {new_id}")
        return _mock_users[new_id]

    async def create_profile(self, data) -> dict:
        """创建用户画像"""
        mbti = data.mbti
        analysis = MBTI_ANALYSIS.get(mbti, {"analysis": "独特的你", "strengths": [], "growth": []})
        pet_traits = MBTI_PET_TRAITS.get(mbti, {"personality_type": "companion", "description": "专属伙伴"})
        styles = MBTI_STYLE_RECOMMENDATIONS.get(mbti, ["anime"])

        user_id = f"user_{uuid.uuid4().hex[:16]}"

        # 保存到数据库
        try:
            supabase = get_supabase()
            supabase.table("users").upsert({
                "id": user_id,
                "mbti": mbti,
                "zodiac": data.zodiac,
                "birth_date": data.birth_date,
                "nickname": data.nickname or "咕噜主人",
                "privacy_level": 1,
                "is_minor": False,
            }).execute()
        except Exception as e:
            print(f"[WARN]  保存用户画像失败: {e}")

        return {
            "user_id": user_id,
            "personality_analysis": analysis["analysis"],
            "recommended_pet_traits": {
                **pet_traits,
                "match_score": 95,
            },
            "recommended_styles": styles,
        }

    async def get_profile(self, user_id: str) -> Optional[dict]:
        """获取用户画像"""
        # demo 模式：从内存读取
        if not is_supabase_available():
            return _mock_users.get(user_id)

        try:
            supabase = get_supabase()
            result = supabase.table("users").select("*").eq("id", user_id).execute()
            if not result.data:
                return None
            user_data = result.data[0]
            mbti = user_data.get("mbti")
            analysis = MBTI_ANALYSIS.get(mbti, {"analysis": "独特的你", "strengths": [], "growth": []})
            pet_traits = MBTI_PET_TRAITS.get(mbti, {"personality_type": "companion", "description": "专属伙伴"})
            styles = MBTI_STYLE_RECOMMENDATIONS.get(mbti, ["anime"])
            # 组装包含 personality_analysis 和 pet_match_score 的响应
            return {
                **user_data,
                "personality_analysis": analysis["analysis"],
                "strengths": analysis.get("strengths", []),
                "growth_areas": analysis.get("growth", []),
                "recommended_pet_traits": {
                    **pet_traits,
                    "match_score": 95,
                },
                "pet_match_score": 95,
                "recommended_styles": styles,
            }
        except Exception as e:
            logger.debug(f"Supabase 不可用，使用内存模式: {e}")
            return _mock_users.get(user_id)

    async def update_profile(self, user_id: str, data: dict) -> Optional[dict]:
        """更新用户信息"""
        try:
            supabase = get_supabase()
            result = supabase.table("users").update(data).eq("id", user_id).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            print(f"[WARN]  更新用户画像失败: {e}")
        return None

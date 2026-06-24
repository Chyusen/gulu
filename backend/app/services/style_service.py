"""咕噜 Gulu — 风格生成服务"""
from typing import Optional
from app.services.image_service import ImageService, STYLE_PROMPTS
from app.services.profile_service import MBTI_STYLE_RECOMMENDATIONS


# 风格对应的 CSS filter（用于前端滤镜效果）
STYLE_FILTER_CSS = {
    "anime": "saturate(1.2) contrast(1.05)",
    "realistic": "none",
    "pixel": "contrast(1.2) saturate(1.1)",
    "scifi": "hue-rotate(180deg) saturate(1.3)",
    "ink": "grayscale(1) contrast(1.1)",
    "vaporwave": "hue-rotate(280deg) saturate(1.5)",
    "sketch": "grayscale(1) contrast(1.3)",
}

# 每种风格的推荐理由
STYLE_REASONS = {
    "anime": "柔和的色彩与温暖的线条，与你内心的温柔相呼应",
    "realistic": "细腻写实的风格，呈现真实的陪伴感",
    "pixel": "复古像素风，唤起纯真的童年记忆",
    "scifi": "未来科幻风，匹配你理性的思考方式",
    "ink": "水墨意境，呼应你内敛深邃的气质",
    "vaporwave": "蒸汽波美学，与你丰富的想象力共鸣",
    "sketch": "手绘素描风，呈现质朴而真诚的陪伴",
}


class StyleService:
    def __init__(self):
        self.image_service = ImageService()

    async def generate(self, data) -> dict:
        url = await self.image_service.generate_pet_image(
            style=data.style,
            custom_description=data.custom_prompt,
        )
        return {
            "image_url": url,
            "style": data.style,
            "style_applied": data.style,
            "filter_css": STYLE_FILTER_CSS.get(data.style, "none"),
        }

    async def recommend(self, mbti: str) -> dict:
        styles = MBTI_STYLE_RECOMMENDATIONS.get(mbti, ["anime"])
        # 返回对象数组，包含 style/reason/preview_url
        recommended = [
            {
                "style": s,
                "reason": STYLE_REASONS.get(s, "适合你的独特气质"),
                "preview_url": f"https://placehold.co/256x256/FFB6C1/FFFFFF?text={s}",
            }
            for s in styles
        ]
        return {
            "mbti": mbti,
            "recommended_styles": recommended,
        }

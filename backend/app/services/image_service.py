"""
咕噜 Gulu — 图像生成服务
对应需求文档 三、宠物生成系统 / 3.3 视觉风格
v2.0 新增 generate_pet_image_with_prompt / default_placeholder_url
v2.1 新增：使用 request_with_retry 替代直接 httpx 调用（超时+重试）
"""

import logging
from typing import Optional, Tuple
from app.core.config import settings
from app.utils.http_retry import request_with_retry

logger = logging.getLogger(__name__)


# 7 种风格的 prompt 模板（对齐需求文档 Step 6 基因注入）
STYLE_PROMPTS = {
    "anime": "anime style, chibi, cute, soft colors, Studio Ghibli inspired, warm lighting",
    "realistic": "realistic fur, lifelike, detailed, soft natural lighting, photographic",
    "pixel": "pixel art, 16-bit, retro game style, vibrant colors",
    "scifi": "cyberpunk, neon, futuristic, sci-fi style",
    "ink": "chinese ink wash, sumi-e, traditional, elegant, monochrome",
    "vaporwave": "vaporwave aesthetic, retrowave, pastel colors, retro 80s, dreamy",
    "sketch": "pencil sketch, hand-drawn, artistic, minimalist",
}

# 基础宠物 prompt（对齐后端 Agent Prompt 模板）
BASE_PET_PROMPT = (
    "a cute mystical pet companion, round body, big expressive eyes, "
    "soft fur, gentle smile, magical aura, "
    "soft glowing purple aura, dreamy cosmic background, "
    "high quality, detailed, kawaii, "
    "simple background, centered composition"
)

# 占位图 URL（紫色主题）
_PLACEHOLDER_URL = "https://placehold.co/512x512/6B4EE6/F3E8FF?text=Gulu"


class ImageService:
    def default_placeholder_url(self) -> str:
        """返回默认占位图 URL（紫色主题）"""
        return _PLACEHOLDER_URL

    def _build_prompt(
        self,
        style: str,
        custom_description: Optional[str] = None,
        mbti: Optional[str] = None,
        zodiac: Optional[str] = None,
    ) -> str:
        """构建发送给 SD 的英文 prompt"""
        style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["anime"])
        parts = [BASE_PET_PROMPT, style_prompt]
        if custom_description:
            parts.append(custom_description)
        # MBTI/星座微调（可选，影响氛围）
        if mbti:
            mbti_upper = mbti.upper()
            if mbti_upper.startswith("I"):
                parts.append("introspective mood, serene atmosphere")
            else:
                parts.append("lively mood, warm atmosphere")
        if zodiac:
            parts.append(f"zodiac {zodiac} inspired subtle elements")
        return ", ".join(parts)

    async def generate_pet_image_with_prompt(
        self,
        style: str,
        custom_description: Optional[str] = None,
        mbti: Optional[str] = None,
        zodiac: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        调用 SiliconFlow SD 生成宠物图片，返回 (image_url, prompt_used)。
        - 若未配置 API_KEY，返回占位图。
        - 失败时返回占位图。
        - 使用 request_with_retry 实现超时(60s)+重试(2次)。
        """
        prompt_used = self._build_prompt(style, custom_description, mbti, zodiac)

        if not settings.SILICONFLOW_API_KEY:
            logger.info("未配置 SILICONFLOW_API_KEY，返回占位图")
            return self.default_placeholder_url(), prompt_used

        try:
            resp = await request_with_retry(
                "POST",
                settings.SILICONFLOW_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": prompt_used,
                    "image_size": "512x512",
                    "batch_size": 1,
                    "num_inference_steps": 30,
                },
                timeout=60,
                retries=2,
            )
            if resp:
                data = resp.json()
                if data.get("images"):
                    url = data["images"][0].get("url", "")
                    if url:
                        return url, prompt_used
        except Exception as e:
            logger.warning(f"图像生成失败: {e}")

        return self.default_placeholder_url(), prompt_used

    async def generate_pet_image(
        self,
        style: str,
        custom_description: Optional[str] = None,
    ) -> str:
        """旧版接口：仅返回 image_url（保持向后兼容）"""
        url, _ = await self.generate_pet_image_with_prompt(
            style=style,
            custom_description=custom_description,
        )
        return url

    async def generate_state_variant(
        self,
        base_image_url: str,
        state: str,
    ) -> str:
        """生成状态变体（happy/sad/graying/dormant）"""
        # 实际应基于 base_image_url 用 img2img 生成变体
        # 简化版：返回原图
        return base_image_url

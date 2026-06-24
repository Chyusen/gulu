"""
咕噜 Gulu — AI 生成形象 Prompt 模板
对应 tech-plan-2026 方案三
支持 4 种风格 × 4 种生成类型
"""

from typing import Optional

# 4 种视觉风格
STYLE_PROMPTS = {
    "3d_cartoon": "3D cartoon style, Pixar-like, soft lighting, vibrant colors, cute and adorable, high quality render",
    "2d_anime": "2D anime style, Japanese animation, cel shading, expressive eyes, detailed hair, studio quality",
    "pixel_art": "pixel art style, 16-bit retro game aesthetic, limited color palette, crisp pixels, nostalgic feel",
    "cyberpunk": "cyberpunk style, neon lights, futuristic, dark atmosphere, holographic elements, sci-fi",
}

# 4 种生成类型的基础 Prompt
TYPE_BASE_PROMPTS = {
    "pet_avatar": (
        "a cute mystical pet companion, round body, big expressive eyes, "
        "soft fur, gentle smile, magical aura, centered composition, simple background"
    ),
    "pet_evolution": (
        "a majestic evolved mystical pet companion, glowing aura, "
        "powerful but gentle, intricate details, cosmic background, epic composition"
    ),
    "user_avatar": (
        "a cute cartoon avatar of a person, friendly expression, "
        "stylized, clean lines, centered composition, simple background"
    ),
    "scene_illustration": (
        "a dreamy scene illustration, magical atmosphere, "
        "soft colors, whimsical, detailed background, artistic"
    ),
}


def build_prompt(
    gen_type: str,
    style: str,
    custom_prompt: Optional[str] = None,
    user_description: Optional[str] = None,
) -> str:
    """构建发送给图像生成模型的英文 Prompt"""
    base = TYPE_BASE_PROMPTS.get(gen_type, TYPE_BASE_PROMPTS["pet_avatar"])
    style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["3d_cartoon"])
    parts = [base, style_prompt]
    if custom_prompt:
        parts.append(custom_prompt)
    if user_description:
        parts.append(f"inspired by owner: {user_description}")
    return ", ".join(parts)

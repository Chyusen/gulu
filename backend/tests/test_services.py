"""
咕噜 Gulu — 服务层单元测试
覆盖核心纯函数逻辑（不依赖外部服务）
"""

import pytest

from app.services.pet_service import _build_personality_type, STAGE_INT_TO_STR, STAGE_STR_TO_INT
from app.services.explore_service import _haversine_meters, _blur_location
from app.core.database import is_supabase_available


# ========== _build_personality_type ==========

class TestBuildPersonalityType:
    """personality_type 生成"""

    def test_with_mbti_and_zodiac(self):
        result = _build_personality_type("INFJ", "摩羯座")
        assert result == "INFJ-摩羯型灵魂镜"

    def test_with_zodiac_no_suffix(self):
        result = _build_personality_type("ENFP", "摩羯")
        assert result == "ENFP-摩羯型火花镜"

    def test_without_mbti(self):
        result = _build_personality_type(None, "摩羯座")
        assert result.startswith("SOUL-摩羯型")

    def test_without_zodiac(self):
        result = _build_personality_type("INFJ", None)
        assert "INFJ" in result
        assert "星" in result

    def test_unknown_mbti_uses_default(self):
        result = _build_personality_type("XXXX", "摩羯座")
        assert "灵魂镜" in result


# ========== 阶段映射 ==========

class TestStageMapping:
    """阶段映射"""

    def test_int_to_str(self):
        assert STAGE_INT_TO_STR[1] == "baby"
        assert STAGE_INT_TO_STR[2] == "adult"
        assert STAGE_INT_TO_STR[3] == "divine"

    def test_str_to_int(self):
        assert STAGE_STR_TO_INT["baby"] == 1
        assert STAGE_STR_TO_INT["adult"] == 2
        assert STAGE_STR_TO_INT["divine"] == 3


# ========== _haversine_meters ==========

class TestHaversine:
    """Haversine 距离计算"""

    def test_same_point(self):
        assert _haversine_meters(31.0, 121.0, 31.0, 121.0) == 0.0

    def test_short_distance(self):
        # 上海两点相距约 100m
        d = _haversine_meters(31.2304, 121.4737, 31.2313, 121.4737)
        assert 80 < d < 120

    def test_long_distance(self):
        # 上海到北京约 1000+ km
        d = _haversine_meters(31.2304, 121.4737, 39.9042, 116.4074)
        assert d > 1_000_000  # > 1000 km


# ========== _blur_location ==========

class TestBlurLocation:
    """位置模糊化"""

    def test_blur_keeps_three_decimals(self):
        assert _blur_location(31.230456) == 31.230
        assert _blur_location(121.473789) == 121.474

    def test_blur_already_three_decimals(self):
        assert _blur_location(31.230) == 31.230


# ========== is_supabase_available ==========

class TestSupabaseAvailability:
    """Supabase 可用性检查"""

    def test_returns_bool(self):
        result = is_supabase_available()
        assert isinstance(result, bool)

    def test_false_when_not_configured(self):
        """未配置时返回 False（demo 模式环境）"""
        from app.core.config import settings
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            assert is_supabase_available() is False


# ========== ExploreService 降级方案 ==========

class TestExploreServiceFallback:
    """探索服务降级方案"""

    def test_default_pois_count(self):
        """降级 POI 列表应有 5 个"""
        from app.services.explore_service import ExploreService
        service = ExploreService()
        pois = service._default_pois()
        assert len(pois) == 5
        assert all("name" in p for p in pois)

    def test_build_simple_guides(self):
        """降级简洁路线生成"""
        from app.services.explore_service import ExploreService
        service = ExploreService()
        pois = service._default_pois()
        guides = service._build_simple_guides("INFJ", "摩羯座", "上海", pois, 2)
        assert len(guides) >= 1
        assert all("title" in g for g in guides)
        assert all("pois" in g for g in guides)

    def test_build_simple_guides_i_type(self):
        """I 型 MBTI 应生成安静独处路线"""
        from app.services.explore_service import ExploreService
        service = ExploreService()
        pois = service._default_pois()
        guides = service._build_simple_guides("INFP", "双鱼座", "北京", pois, 1)
        assert "安静独处" in guides[0]["title"]

    def test_build_simple_guides_e_type(self):
        """E 型 MBTI 应生成热闹活力路线"""
        from app.services.explore_service import ExploreService
        service = ExploreService()
        pois = service._default_pois()
        guides = service._build_simple_guides("ENFP", "狮子座", "上海", pois, 1)
        assert "热闹活力" in guides[0]["title"]


# ========== ImageService prompt 构建 ==========

class TestImageServicePrompt:
    """图像服务 prompt 构建"""

    def test_build_prompt_anime(self):
        from app.services.image_service import ImageService
        service = ImageService()
        prompt = service._build_prompt("anime")
        assert "anime" in prompt
        assert "purple aura" in prompt

    def test_build_prompt_with_custom(self):
        from app.services.image_service import ImageService
        service = ImageService()
        prompt = service._build_prompt("scifi", "赛博朋克小狐狸")
        assert "赛博朋克小狐狸" in prompt
        assert "cyberpunk" in prompt

    def test_build_prompt_with_mbti_introvert(self):
        from app.services.image_service import ImageService
        service = ImageService()
        prompt = service._build_prompt("ink", mbti="INFJ")
        assert "introspective" in prompt

    def test_build_prompt_with_mbti_extrovert(self):
        from app.services.image_service import ImageService
        service = ImageService()
        prompt = service._build_prompt("ink", mbti="ENFP")
        assert "lively" in prompt

    def test_default_placeholder_url(self):
        from app.services.image_service import ImageService
        service = ImageService()
        url = service.default_placeholder_url()
        assert "placehold.co" in url
        assert "6B4EE6" in url  # 紫色主题色

"""
咕噜 Gulu — schemas 单元测试
覆盖核心 Pydantic 校验逻辑
"""

import pytest
from pydantic import ValidationError

from app.schemas.profile import ProfileSaveRequest
from app.schemas.pet import GenerateImageRequest, CreatePetRequest
from app.schemas.explore import CitywalkGuideRequest
from app.schemas.common import ApiResponse, ErrorCode


# ========== ProfileSaveRequest ==========

class TestProfileSaveRequest:
    """用户画像保存请求校验"""

    def test_valid_profile(self):
        data = ProfileSaveRequest(nickname="小明", mbti="infj", zodiac="摩羯座")
        assert data.nickname == "小明"
        assert data.mbti == "INFJ"  # 自动转大写
        assert data.zodiac == "摩羯座"

    def test_invalid_mbti_length(self):
        with pytest.raises(ValidationError):
            ProfileSaveRequest(nickname="小明", mbti="INF", zodiac="摩羯座")

    def test_invalid_mbti_letter(self):
        with pytest.raises(ValidationError):
            ProfileSaveRequest(nickname="小明", mbti="XXXJ", zodiac="摩羯座")

    def test_invalid_zodiac(self):
        with pytest.raises(ValidationError):
            ProfileSaveRequest(nickname="小明", mbti="INFJ", zodiac="蛇夫座")

    def test_nickname_too_long(self):
        with pytest.raises(ValidationError):
            ProfileSaveRequest(nickname="超长昵称超长昵称超长昵称X", mbti="INFJ", zodiac="摩羯座")

    def test_nickname_empty(self):
        with pytest.raises(ValidationError):
            ProfileSaveRequest(nickname="", mbti="INFJ", zodiac="摩羯座")


# ========== GenerateImageRequest ==========

class TestGenerateImageRequest:
    """AI 形象生成请求校验"""

    def test_valid_with_style_only(self):
        data = GenerateImageRequest(style="anime")
        assert data.style == "anime"
        assert data.custom_prompt is None

    def test_valid_with_custom_prompt(self):
        data = GenerateImageRequest(
            style="scifi",
            custom_prompt="赛博朋克小狐狸",
            mbti="INFJ",
            zodiac="摩羯座",
        )
        assert data.style == "scifi"
        assert data.custom_prompt == "赛博朋克小狐狸"

    def test_invalid_style(self):
        with pytest.raises(ValidationError):
            GenerateImageRequest(style="cartoon")  # 不在 7 种风格内


# ========== CreatePetRequest ==========

class TestCreatePetRequest:
    """创建宠物请求校验"""

    def test_valid_pet(self):
        data = CreatePetRequest(name="咕噜", style="anime")
        assert data.name == "咕噜"
        assert data.style == "anime"
        assert data.image_task_id is None

    def test_name_too_long(self):
        with pytest.raises(ValidationError):
            CreatePetRequest(name="超长宠物名超长宠物名", style="anime")

    def test_name_empty(self):
        with pytest.raises(ValidationError):
            CreatePetRequest(name="", style="anime")


# ========== CitywalkGuideRequest ==========

class TestCitywalkGuideRequest:
    """Citywalk 攻略请求校验"""

    def test_valid_request(self):
        data = CitywalkGuideRequest(
            mbti="infj",
            zodiac="摩羯座",
            lat=31.2304,
            lng=121.4737,
            city="上海",
        )
        assert data.mbti == "INFJ"
        assert data.radius == 3000
        assert data.limit == 3

    def test_invalid_lat(self):
        with pytest.raises(ValidationError):
            CitywalkGuideRequest(
                mbti="INFJ", zodiac="摩羯座", lat=100, lng=121,
            )

    def test_invalid_lng(self):
        with pytest.raises(ValidationError):
            CitywalkGuideRequest(
                mbti="INFJ", zodiac="摩羯座", lat=31, lng=200,
            )


# ========== ApiResponse ==========

class TestApiResponse:
    """统一响应格式"""

    def test_success_response(self):
        resp = ApiResponse.success(data={"id": 1}, message="ok")
        assert resp.code == ErrorCode.OK
        assert resp.data == {"id": 1}
        assert resp.message == "ok"

    def test_error_response(self):
        resp = ApiResponse.error(code=ErrorCode.INVALID_PARAM, message="参数错误")
        assert resp.code == ErrorCode.INVALID_PARAM
        assert resp.message == "参数错误"
        assert resp.data is None

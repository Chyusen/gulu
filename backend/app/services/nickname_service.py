"""
咕噜 Gulu — 昵称审查服务
对应需求文档 6.1 昵称合规审查
实现 API 15
"""

from app.constants.nickname_words import check_nickname, check_pet_name


class NicknameService:
    """昵称合规审查服务"""

    def check(self, nickname: str) -> dict:
        """
        审查昵称是否合规。
        返回 { is_valid, reason }
        """
        return check_nickname(nickname)

    def check_pet_name(self, name: str) -> dict:
        """审查宠物昵称是否合规"""
        return check_pet_name(name)

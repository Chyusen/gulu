"""
咕噜 Gulu — 昵称合规审查敏感词库
对应需求文档 6.1 昵称合规审查
"""

from typing import List

# ========== 敏感词库（Demo 阶段本地词库） ==========
# 广告类
AD_WORDS: List[str] = [
    "加微信", "加v", "加V", "加q", "加Q", "微信号", "qq号", "QQ号",
    "代理", "代购", "微商", "低价出售", "出售", "批发", "加我",
    "优惠", "折扣", "促销", "秒杀", "包邮", "免费送",
    "淘宝", "天猫", "京东", "拼多多", "抖音号", "快手号",
    "http", "https", "www", ".com", ".cn", ".net",
]

# 违规类
VIOLATION_WORDS: List[str] = [
    "赌博", "博彩", "彩票", "色情", "黄色", "裸体",
    "毒品", "吸毒", "违禁", "枪支", "弹药",
    "反动", "政治敏感",
]

# 侮辱性词汇
INSULT_WORDS: List[str] = [
    "傻逼", "草泥马", "滚蛋", "去死", "废物",
    "贱人", "婊子", "妓女", "强奸",
]

# 所有敏感词合并
ALL_SENSITIVE_WORDS = AD_WORDS + VIOLATION_WORDS + INSULT_WORDS


# ========== 昵称长度限制 ==========
NICKNAME_MIN_LENGTH = 1
NICKNAME_MAX_LENGTH = 12
PET_NAME_MAX_LENGTH = 8


def check_nickname(nickname: str) -> dict:
    """
    检查昵称是否合规。
    返回 { is_valid: bool, reason: str }
    """
    if not nickname or not nickname.strip():
        return {"is_valid": False, "reason": "昵称不能为空"}

    nickname = nickname.strip()

    if len(nickname) < NICKNAME_MIN_LENGTH:
        return {"is_valid": False, "reason": "昵称太短了"}

    if len(nickname) > NICKNAME_MAX_LENGTH:
        return {"is_valid": False, "reason": f"昵称不能超过 {NICKNAME_MAX_LENGTH} 个字符"}

    # 检查敏感词
    for word in AD_WORDS:
        if word in nickname:
            return {"is_valid": False, "reason": "包含广告内容"}

    for word in VIOLATION_WORDS:
        if word in nickname:
            return {"is_valid": False, "reason": "包含违规内容"}

    for word in INSULT_WORDS:
        if word in nickname:
            return {"is_valid": False, "reason": "包含不当用语"}

    return {"is_valid": True, "reason": ""}


def check_pet_name(name: str) -> dict:
    """
    检查宠物昵称是否合规。
    """
    if not name or not name.strip():
        return {"is_valid": False, "reason": "宠物名不能为空"}

    name = name.strip()

    if len(name) > PET_NAME_MAX_LENGTH:
        return {"is_valid": False, "reason": f"宠物名不能超过 {PET_NAME_MAX_LENGTH} 个字符"}

    # 复用敏感词检查
    for word in ALL_SENSITIVE_WORDS:
        if word in name:
            return {"is_valid": False, "reason": "包含不合适的内容"}

    return {"is_valid": True, "reason": ""}

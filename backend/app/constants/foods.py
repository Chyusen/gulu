"""
咕噜 Gulu — 食物数据
对应需求文档 2.5 食物偏好系统
"""

from typing import List, Dict, Optional


# ========== 食物品质 ==========
QUALITY_COMMON = "common"
QUALITY_FINE = "fine"
QUALITY_RARE = "rare"

QUALITY_LABELS = {
    QUALITY_COMMON: "普通",
    QUALITY_FINE: "优良",
    QUALITY_RARE: "稀有",
}

# ========== 偏好食物亲密度加成 ==========
PREFERENCE_BONUS = {
    QUALITY_COMMON: 0.30,  # +30%
    QUALITY_FINE: 0.40,    # +40%
    QUALITY_RARE: 0.50,    # +50%
}

# ========== 食物数据 ==========
FOODS: List[Dict] = [
    # 普通品质
    {
        "id": "food_basic",
        "name": "基础咕噜粮",
        "quality": QUALITY_COMMON,
        "stamina": 15,
        "intimacy": 5,
        "price": 0,  # 免费
        "is_basic": True,  # 每日限量 3 份
        "description": "每日免费基础食物，体力 +15，亲密度 +5",
    },
    {
        "id": "food_sun_grass",
        "name": "阳光草",
        "quality": QUALITY_COMMON,
        "stamina": 10,
        "intimacy": 5,
        "price": 10,
        "is_basic": False,
        "description": "温暖的阳光草，体力 +10",
    },
    {
        "id": "food_moon_dew",
        "name": "月光露",
        "quality": QUALITY_COMMON,
        "stamina": 10,
        "intimacy": 5,
        "price": 10,
        "is_basic": False,
        "description": "清甜的月光露，体力 +10",
    },
    # 优良品质
    {
        "id": "food_soul_berry",
        "name": "灵魂浆果",
        "quality": QUALITY_FINE,
        "stamina": 18,
        "intimacy": 8,
        "price": 30,
        "is_basic": False,
        "description": "蕴含灵魂能量的浆果，体力 +18",
    },
    {
        "id": "food_star_rice",
        "name": "星辉米饭",
        "quality": QUALITY_FINE,
        "stamina": 18,
        "intimacy": 8,
        "price": 30,
        "is_basic": False,
        "description": "闪烁星辉的米饭，体力 +18",
    },
    # 稀有品质
    {
        "id": "food_dream_fish",
        "name": "梦境鱼",
        "quality": QUALITY_RARE,
        "stamina": 25,
        "intimacy": 10,
        "price": 80,
        "is_basic": False,
        "description": "来自梦境深处的鱼，体力 +25",
    },
    {
        "id": "food_cosmic_honey",
        "name": "宇宙蜂蜜",
        "quality": QUALITY_RARE,
        "stamina": 25,
        "intimacy": 10,
        "price": 80,
        "is_basic": False,
        "description": "宇宙蜂巢的珍稀蜂蜜，体力 +25",
    },
]

# ========== 食物 ID → 数据映射 ==========
FOOD_MAP: Dict[str, Dict] = {f["id"]: f for f in FOODS}

# ========== 每日基础食物限额 ==========
DAILY_BASIC_FOOD_LIMIT = 3

# ========== 性格 → 偏好食物映射 ==========
# personality_type 由 MBTI×星座交叉匹配生成
PERSONALITY_FOOD_PREFERENCES: Dict[str, List[str]] = {
    "dreamer": ["food_soul_berry", "food_dream_fish", "food_moon_dew"],
    "mystic": ["food_cosmic_honey", "food_dream_fish", "food_moon_dew"],
    "thinker": ["food_star_rice", "food_soul_berry", "food_sun_grass"],
    "strategist": ["food_star_rice", "food_cosmic_honey", "food_sun_grass"],
    "artist": ["food_dream_fish", "food_soul_berry", "food_moon_dew"],
    "guardian": ["food_star_rice", "food_sun_grass", "food_soul_berry"],
    "craftsman": ["food_star_rice", "food_sun_grass", "food_cosmic_honey"],
    "keeper": ["food_sun_grass", "food_star_rice", "food_soul_berry"],
    "spark": ["food_cosmic_honey", "food_soul_berry", "food_sun_grass"],
    "guide": ["food_star_rice", "food_cosmic_honey", "food_soul_berry"],
    "debater": ["food_star_rice", "food_cosmic_honey", "food_sun_grass"],
    "commander": ["food_cosmic_honey", "food_star_rice", "food_sun_grass"],
    "performer": ["food_cosmic_honey", "food_soul_berry", "food_sun_grass"],
    "host": ["food_star_rice", "food_soul_berry", "food_cosmic_honey"],
    "adventurer": ["food_cosmic_honey", "food_sun_grass", "food_star_rice"],
    "manager": ["food_star_rice", "food_sun_grass", "food_cosmic_honey"],
}


def get_food_by_id(food_id: str) -> Optional[Dict]:
    """根据 ID 获取食物数据"""
    return FOOD_MAP.get(food_id)


def get_preferred_foods(personality_type: str) -> List[str]:
    """根据宠物性格获取偏好食物 ID 列表"""
    return PERSONALITY_FOOD_PREFERENCES.get(personality_type, [])


def calculate_feed_result(
    food: Dict,
    is_preferred: bool,
) -> Dict:
    """
    计算喂食结果。
    返回 stamina_gained, intimacy_gained, preference_bonus。
    """
    stamina = food["stamina"]
    base_intimacy = food["intimacy"]

    if is_preferred:
        bonus_rate = PREFERENCE_BONUS.get(food["quality"], 0.3)
        intimacy = int(base_intimacy * (1 + bonus_rate))
        bonus_text = f"+{int(bonus_rate * 100)}%"
    else:
        intimacy = base_intimacy
        bonus_text = None

    return {
        "stamina_gained": stamina,
        "intimacy_gained": intimacy,
        "is_preferred": is_preferred,
        "preference_bonus": bonus_text,
        "gulu_coin_spent": food["price"],
    }

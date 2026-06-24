"""
咕噜 Gulu — 任务模板
对应需求文档 3.2 每日任务 / 3.3 每周任务
"""

from typing import Dict, List

# ========== 每日任务模板 ==========
# 按进化阶段递增门槛
DAILY_TASK_TEMPLATES: List[Dict] = [
    {
        "type": "chat",
        "description_template": "与宠物对话 {target} 次",
        "targets": {1: 1, 2: 3, 3: 5},
        "base_reward": 20,
    },
    {
        "type": "feed",
        "description_template": "喂食宠物 {target} 次",
        "targets": {1: 1, 2: 2, 3: 3},
        "base_reward": 15,
    },
    {
        "type": "explore",
        "description_template": "外出探索（散步/运动/Citywalk）{target} 次",
        "targets": {1: 1, 2: 2, 3: 3},
        "base_reward": 30,
    },
    {
        "type": "companion",
        "description_template": "完成陪伴活动 {target} 次",
        "targets": {1: 1, 2: 2, 3: 3},
        "base_reward": 25,
    },
    {
        "type": "social",
        "description_template": "社交互动 {target} 次",
        "targets": {1: 1, 2: 2, 3: 3},
        "base_reward": 20,
    },
]

# ========== 阶梯奖励倍率 ==========
# 完成数量 → 单个任务奖励倍率
TIER_MULTIPLIERS: Dict[int, float] = {
    1: 1.0,
    2: 1.0,
    3: 1.2,
    4: 1.5,
    5: 2.0,
}

# 5/5 额外奖励
ALL_COMPLETE_BONUS = 50

# 连击加成阈值
STREAK_THRESHOLD = 3  # 连续 3 天全完成
STREAK_BONUS = 1.5    # 第 4 天起 ×1.5

# ========== 每周任务模板 ==========
WEEKLY_TASK_TEMPLATES: List[Dict] = [
    {
        "type": "explore",
        "description_template": "累计探索 {target} 次",
        "target": 5,
        "base_reward": 10,  # 星尘
    },
    {
        "type": "chat",
        "description_template": "累计与宠物对话 {target} 次",
        "target": 15,
        "base_reward": 8,
    },
    {
        "type": "companion",
        "description_template": "完成 {target} 次陪伴活动",
        "target": 3,
        "base_reward": 12,
    },
]

# ========== 每周任务完成率系数 ==========
WEEKLY_COMPLETION_RATE_MULTIPLIERS = [
    (1.0, 2.0),   # 100% → ×2.0
    (0.8, 1.5),   # ≥80% → ×1.5
    (0.5, 1.0),   # ≥50% → ×1.0
    (0.0, 0.5),   # <50% → ×0.5
]


def get_weekly_multiplier(completion_rate: float) -> float:
    """根据本周每日任务完成率获取星尘系数"""
    for threshold, multiplier in WEEKLY_COMPLETION_RATE_MULTIPLIERS:
        if completion_rate >= threshold:
            return multiplier
    return 0.5


def get_tier_multiplier(completed_count: int) -> float:
    """获取阶梯奖励倍率"""
    return TIER_MULTIPLIERS.get(completed_count, 2.0)

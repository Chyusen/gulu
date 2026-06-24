"""
咕噜 Gulu — 进化体系常量
对应需求文档 二、宠物进化体系
"""

# ========== 阶段名称 ==========
STAGE_NAMES = {
    1: "萌芽体",
    2: "成长体",
    3: "灵魂体",
}

STAGE_INT_TO_STR = {1: "baby", 2: "adult", 3: "divine"}
STAGE_STR_TO_INT = {v: k for k, v in STAGE_INT_TO_STR.items()}

# ========== 各阶段数值上限 ==========
STAGE_LIMITS = {
    1: {"stamina": 100, "intimacy": 300, "energy": 500},
    2: {"stamina": 150, "intimacy": 500, "energy": 1500},
    3: {"stamina": 200, "intimacy": 800, "energy": 3000},
}

# ========== 进化阈值 ==========
# key = 当前阶段（1→2, 2→3）
EVOLUTION_THRESHOLDS = {
    1: {
        "intimacy": 200,
        "energy": 500,
        "stamina_percent": 0.5,  # 当前体力需 ≥ 上限的 50%
    },
    2: {
        "intimacy": 500,
        "energy": 1500,
        "stamina_percent": 0.5,
    },
}

# ========== 亲密度衰减规则 ==========
INTIMACY_DECAY = {
    "grace_hours": 24,       # 0~24h 不衰减
    "mild_rate": 0.02,       # 24~72h 每天 -2%
    "mild_max_hours": 72,
    "accelerated_rate": 0.05,  # 72h+ 每天 -5%
}

# ========== 体力阈值 ==========
STAMINA_THRESHOLD = {
    "explore_min_percent": 0.2,   # <20% 无法探索
    "tired_percent": 0.1,         # <10% 疲惫状态
    "sleep_value": 0,             # =0 沉睡
}

# ========== 自主探索体力消耗（每小时） ==========
AUTO_EXPLORE_STAMINA_PER_HOUR = {
    1: 5,   # 萌芽体
    2: 8,   # 成长体
    3: 12,  # 灵魂体
}

# ========== 自主探索时长选项（小时） ==========
AUTO_EXPLORE_DURATIONS = [1, 2, 4, 8]

# ========== 进化解锁内容 ==========
EVOLUTION_UNLOCKS = {
    1: {  # 萌芽体 → 成长体
        "interactions": "新增 3 种互动",
        "dialogue": "对话更丰富、更有个性",
        "explore_range": "+50%",
        "auto_explore_max_hours": 4,
    },
    2: {  # 成长体 → 灵魂体
        "interactions": "全部互动解锁",
        "dialogue": "深度对话、灵魂共鸣",
        "explore_range": "+100%",
        "auto_explore_max_hours": 8,
    },
}

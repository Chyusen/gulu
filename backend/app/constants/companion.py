"""
咕噜 Gulu — 室内陪伴活动配置
对应需求文档 4.9 室内陪伴活动
"""

from typing import Dict, List


# ========== 活动类型 ==========
COMPANION_ACTIVITIES: Dict[str, Dict] = {
    "meditation": {
        "name": "冥想呼吸",
        "min_minutes": 3,
        "max_minutes": 10,
        "energy_min": 5,
        "energy_max": 15,
        "intimacy": 5,
        "stamina_cost": 0,
        "description": "引导式呼吸练习，宠物陪伴静心",
    },
    "pomodoro": {
        "name": "番茄学习",
        "min_minutes": 25,
        "max_minutes": 25,
        "energy_min": 10,
        "energy_max": 10,
        "intimacy": 15,
        "stamina_cost": 0,
        "description": "宠物陪伴学习，计时结束提醒休息",
    },
    "journal": {
        "name": "写日记",
        "min_minutes": 5,
        "max_minutes": 15,
        "energy_min": 5,
        "energy_max": 5,
        "intimacy": 10,
        "stamina_cost": 0,
        "description": "宠物倾听并回应，鼓励表达",
    },
    "music": {
        "name": "听音乐",
        "min_minutes": 10,
        "max_minutes": 30,
        "energy_min": 8,
        "energy_max": 8,
        "intimacy": 5,
        "stamina_cost": 0,
        "description": "宠物一起听并轻轻摇摆",
    },
}

# ========== 散步/运动/Citywalk 配置 ==========
ACTIVITY_CONFIG: Dict[str, Dict] = {
    "walk": {
        "name": "散步",
        "stamina_min": 10,
        "stamina_max": 20,
        "energy_min": 15,
        "energy_max": 30,
        "intimacy_min": 5,
        "intimacy_max": 10,
        "gulu_coin_min": 5,
        "gulu_coin_max": 15,
    },
    "run": {
        "name": "运动",
        "stamina_min": 20,
        "stamina_max": 40,
        "energy_min": 25,
        "energy_max": 50,
        "intimacy_min": 8,
        "intimacy_max": 15,
        "gulu_coin_min": 8,
        "gulu_coin_max": 20,
    },
    "citywalk": {
        "name": "Citywalk",
        "stamina_min": 15,
        "stamina_max": 30,
        "energy_min": 20,
        "energy_max": 40,
        "intimacy_min": 5,
        "intimacy_max": 10,
        "gulu_coin_min": 5,
        "gulu_coin_max": 15,
    },
}


# ========== 咕噜评语模板 ==========
ACTIVITY_COMMENTS: Dict[str, List[str]] = {
    "walk": [
        "今天走了好远呢，咕噜好开心！",
        "和你一起散步，感觉风都是甜的～",
        "咕噜最喜欢和你一起慢慢走了～",
    ],
    "run": [
        "运动完感觉元气满满！你也一起加油～",
        "咕噜看到你这么努力，好佩服呀！",
        "出了一身汗，但是心情好好～",
    ],
    "citywalk": [
        "这条路线好美，下次还来好不好～",
        "咕噜发现了一个好有趣的地方！",
        "和你一起探索城市，每一处都是风景～",
    ],
    "meditation": [
        "一起安静地待着，也很幸福呢～",
        "咕噜感觉心都静下来了，谢谢你～",
        "深呼吸，世界都变温柔了～",
    ],
    "pomodoro": [
        "专注的你好闪耀！咕噜也学到了很多～",
        "休息一下吧，咕噜给你递杯水～",
        "一个番茄钟完成啦！你好棒～",
    ],
    "journal": [
        "咕噜认真听了你写的每一个字～",
        "表达出来，心里会舒服很多哦～",
        "你的故事，咕噜都记在心里了～",
    ],
    "music": [
        "这段音乐好好听，咕噜跟着轻轻摇摆～",
        "和你一起听歌，时间都变慢了～",
        "咕噜最喜欢这个旋律了～",
    ],
}


# ========== 咕噜悄悄话模板 ==========
# 外向型（social）— 社交对话
WHISPER_TEMPLATES_SOCIAL: List[str] = [
    "今天认识了新朋友小花！我们一起追蝴蝶，它跑得好快好快～",
    "遇到了一只很酷的咕噜，它教我怎么在草地上打滚！",
    "今天和三只咕噜一起开了一场小派对，好热闹呀～",
    "在公园里遇到了一只害羞的咕噜，我主动打了招呼，它好开心！",
    "今天和隔壁的小狗聊了天，它说它的主人也很温柔呢～",
]

# 内向型（solo）— 独白式记录
WHISPER_TEMPLATES_SOLO: List[str] = [
    "在角落发现了一朵安静的小花，它和我一样喜欢待在原地。",
    "今天在树荫下休息，看了一下午的云，云的形状好像你。",
    "独自走过一条小路，发现了好多以前没注意过的小细节。",
    "在窗台上看夕阳，想着你此刻在做什么呢。",
    "今天找到了一个很安静的秘密角落，下次带你一起去。",
]

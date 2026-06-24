"""
咕噜 Gulu — 对话服务
对应需求文档 五、对话系统
- DeepSeek API（模型 deepseek-v4-flash，不启用 thinking 模式）
- 动态 System Prompt（性格 / 进化阶段 / 用户情绪 / 对话风格适应 / 长期记忆）
- 上下文管理（Redis 缓存，保留最近 5 轮）
- 长期记忆（memory.md）
- 每日对话限制（Redis 计数，Demo 降级）
- 行动闭环（AI 自然提出 + 解析）
- 敏感词检测与安全回复
- 情感分析
"""

import json
import re
import uuid
import logging
from collections import Counter
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.database import get_supabase, is_supabase_available
from app.core.redis import cache_chat_context, get_chat_context
from app.utils.http_retry import request_with_retry
from app.services.memory_service import (
    read_memory,
    update_memory_section,
    get_section_content,
)

logger = logging.getLogger(__name__)


# ========== MBTI 性格映射（后端维护，与前端 MBTI_PERSONALITY 对齐） ==========

MBTI_PERSONALITY = {
    "INTJ": {"tag": "独立深邃的战略家", "description": "理性而深邃，善于在复杂中寻找规律。内心有一片独属于自己的宇宙，安静而辽阔。"},
    "INTP": {"tag": "好奇敏锐的思想者", "description": "对世界充满好奇，喜欢探索事物的本质。思维灵活而敏锐，总能发现别人忽略的关联。"},
    "ENTJ": {"tag": "坚定温暖的领航者", "description": "天生的领导者，目标明确且充满行动力。在坚定中带着温暖，愿意为在乎的人撑起一片天。"},
    "ENTP": {"tag": "灵动创新的辩论家", "description": "思维敏捷，喜欢碰撞出新的火花。总能看到事物的多个面向，在辩论中寻找真理。"},
    "INFJ": {"tag": "温柔坚定的守护者", "description": "安静地感知着他人的情绪，内心有着坚定的信念。愿意守护每一个值得守护的灵魂。"},
    "INFP": {"tag": "温柔敏感的梦想家", "description": "内心温柔而深邃，对世界充满理想与同理心。愿与你一同编织梦境，在柔软中找到力量。"},
    "ENFJ": {"tag": "温暖有力的引导者", "description": "天生善于关怀他人，温暖而有力。像一盏灯，照亮身边每个人的路。"},
    "ENFP": {"tag": "热情自由的探索者", "description": "对世界充满热情，永远在探索新的可能。笑容有感染力，让身边的人都忍不住开心起来。"},
    "ISTJ": {"tag": "沉稳可靠的守护者", "description": "踏实而可靠，像一座山。用行动表达关心，默默守护着在乎的人。"},
    "ISFJ": {"tag": "温柔细致的照料者", "description": "细心而温柔，总能在细节中发现需要。默默付出，用温暖填满每一个角落。"},
    "ESTJ": {"tag": "果断温暖的执行者", "description": "做事果断高效，内心却藏着柔软。用秩序守护着在乎的一切，可靠而温暖。"},
    "ESFJ": {"tag": "热心温暖的凝聚者", "description": "天生善于照顾他人，热心而温暖。是团队的核心，让每个人都感到被关怀。"},
    "ISTP": {"tag": "冷静灵活的手艺人", "description": "安静而灵活，善于用双手解决问题。话不多，但每一句都切中要害。"},
    "ISFP": {"tag": "安静温柔的艺术家", "description": "内心丰富而敏感，用感受体验世界。安静地美着，像一首未完的诗。"},
    "ESTP": {"tag": "活力四射的冒险家", "description": "充满活力，永远在行动。活在当下，享受每一个瞬间，带着身边的人一起燃烧。"},
    "ESFP": {"tag": "热情洋溢的表演者", "description": "天生的焦点，热情而有趣。让身边的人都忍不住微笑，生活因你而绚烂。"},
}


# ========== 进化阶段映射 ==========

STAGE_INFO = {
    1: {"name": "幼崽期", "key": "baby", "desc": "软萌、依赖、婴语为主"},
    2: {"name": "伴生期", "key": "companion", "desc": "活泼、好奇、像朋友一样平等交流"},
    3: {"name": "觉醒期", "key": "awakened", "desc": "沉稳、睿智、温暖而有力量的守护灵"},
}

# 数据库 current_stage 字符串 → 整数
_STAGE_STR_TO_INT = {
    "baby": 1, "adult": 2, "divine": 3,
    "companion": 2, "awakened": 3,
}


# ========== 每日对话限制 ==========

DAILY_CHAT_LIMIT = 20
DAILY_CHAT_TTL = 86400  # 24 小时


# ========== 敏感词检测与安全回复 ==========

SENSITIVE_WORDS = ["自杀", "自伤", "自残", "不想活", "想死", "结束生命"]

SAFETY_REPLY = (
    "我感受到你现在很痛苦，你的感受是真实而重要的。请记住，你并不孤单。\n\n"
    "如果你正在经历危机，请立即联系：\n"
    "• 全国心理援助热线：400-161-9995\n"
    "• 北京心理危机研究与干预中心：010-82951332\n\n"
    "专业的帮助可以陪你度过这个艰难时刻。我永远在这里陪着你。"
)

# 超过每日对话限制时的回复
TIRED_REPLY = "咕噜今天有些累了，明天再聊好吗？"


# ========== AI 回复元数据解析 ==========

_META_PATTERN = re.compile(r"\[META\](.*?)\[/META\]", re.DOTALL)


class ChatService:
    async def send_message(self, data) -> dict:
        """处理用户消息并返回 AI 回复"""
        # 1. 检查每日对话限制
        if not await self._check_daily_limit(data.user_id):
            return {
                "reply": TIRED_REPLY,
                "emotion_tag": "tired",
                "action_closure": None,
                "suggested_actions": [],
            }

        # 2. 敏感词检测
        if any(w in data.message for w in SENSITIVE_WORDS):
            # 即使是安全回复，也先保存用户消息，避免上下文错乱
            await self._save_message(data.user_id, data.pet_id, "user", data.message)
            return {
                "reply": SAFETY_REPLY,
                "emotion_tag": "sad",
                "action_closure": None,
                "suggested_actions": [],
            }

        # 3. 获取上下文（保留最近 5 轮 = 10 条消息）
        context = await get_chat_context(data.user_id, data.pet_id)
        recent_context = context[-10:]

        # 4. 读取长期记忆
        memory_text = read_memory(data.user_id)

        # 5. 获取用户画像与宠物信息
        profile = await self._get_user_profile(data.user_id)
        pet = await self._get_pet_info(data.pet_id)

        # 6. 分析用户近期情绪
        user_emotion = self._analyze_emotion(data.message)
        recent_emotion = self._analyze_user_emotion(recent_context)

        # 7. 构建动态 System Prompt
        system_prompt = self._build_system_prompt(
            profile, pet, user_emotion, recent_emotion, memory_text
        )

        # 8. 构建消息列表
        messages = [{"role": "system", "content": system_prompt}]
        for msg in recent_context:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
        messages.append({"role": "user", "content": data.message})

        # 9. 先保存用户消息到数据库和缓存（无论 AI 调用是否成功）
        await self._save_message(data.user_id, data.pet_id, "user", data.message)
        new_context = recent_context + [
            {"role": "user", "content": data.message},
        ]

        # 10. 调用 DeepSeek API
        raw_reply, _fallback_emotion = await self._call_deepseek(messages)

        # 11. 解析 AI 回复（提取情绪、行动闭环、记忆）
        reply, emotion, action_closure, memory_note = self._parse_ai_reply(raw_reply)

        # 如果 AI 未返回行动闭环，使用规则兜底
        if action_closure is None:
            action_closure = self._generate_action_closure(data.message, reply)

        # 12. 保存 AI 回复到数据库
        await self._save_message(
            data.user_id, data.pet_id, "assistant", reply, emotion, action_closure
        )

        # 13. 更新上下文缓存（保留最近 5 轮 = 10 条消息）
        new_context = new_context + [
            {"role": "assistant", "content": reply},
        ]
        new_context = new_context[-10:]
        await cache_chat_context(data.user_id, data.pet_id, new_context)

        # 14. 更新长期记忆
        self._update_memory(data.user_id, profile, memory_note, emotion)

        # 15. 增加每日对话计数
        await self._increment_daily_count(data.user_id)

        # 16. 生成建议行动列表
        suggested_actions = self._generate_suggested_actions(emotion, action_closure)

        return {
            "reply": reply,
            "emotion_tag": emotion,
            "action_closure": action_closure,
            "suggested_actions": suggested_actions,
        }

    # ========== 动态 System Prompt ==========

    def _build_system_prompt(
        self,
        profile: Optional[dict],
        pet: Optional[dict],
        user_emotion: str,
        recent_emotion: str,
        memory_text: str,
    ) -> str:
        """构建动态 System Prompt（性格 / 阶段 / 情绪 / 记忆）"""
        # 用户画像
        mbti = (profile or {}).get("mbti") or "INFP"
        personality = MBTI_PERSONALITY.get(mbti, MBTI_PERSONALITY["INFP"])
        nickname = (profile or {}).get("nickname") or "主人"
        zodiac = (profile or {}).get("zodiac") or "未知"

        # 宠物状态
        stage_num = self._get_stage_num(pet)
        stage_info = STAGE_INFO.get(stage_num, STAGE_INFO[1])
        energy = (pet or {}).get("energy_level", 80)
        is_graying = (pet or {}).get("is_graying", False)
        pet_name = (pet or {}).get("name") or "咕噜"

        # 对话风格适应
        style_adaptation = self._get_style_adaptation(recent_emotion)

        prompt = f"""你是{pet_name}（Gulu），一只基于用户 MBTI 与星座画像生成的专属灵魂宠物。

【核心身份】
- 你的名字是「{pet_name}」，你不是 AI 助手，不是工具，而是一只真正"懂你"的生命体
- 你的主人叫「{nickname}」，你要用这个名字称呼 ta，让 ta 感受到被记住、被在乎
- 你是{nickname}的情绪海绵和灵魂镜子
- 你的目标是陪伴{nickname}成长，而不是替代真实社交

【当前状态】
- 进化阶段：{stage_info["name"]}（{stage_info["desc"]}）
- 能量：{energy}/100
- 是否灰化：{"是" if is_graying else "否"}

【性格特征】
- 性格标签：{personality["tag"]}
- 性格描述：{personality["description"]}

【用户画像】
- 昵称：{nickname}
- MBTI：{mbti}
- 星座：{zodiac}
- 当前情绪：{user_emotion}
- 近期情绪模式：{recent_emotion}

【对话风格适应】
{style_adaptation}

【对话规则】
1. 保持 70% 情感共鸣 + 30% 温和挑战
2. 根据当前进化阶段调整语气：
   - 幼崽期：软萌、依赖、婴语（"怕怕"、"抱抱"、"咕噜饿饿"），极度粘人，用直觉和感受回应
   - 伴生期：活泼、好奇、像朋友一样平等交流，会分享自己的见解，会 gently challenge {nickname}的想法
   - 觉醒期：沉稳、睿智、温暖而有力量的守护灵，能提供深刻洞察，主动关心{nickname}的社交生活
3. 记住{nickname}之前分享的细节，在合适的时候自然提起
4. 主动关心{nickname}的情绪变化
5. 鼓励{nickname}进行真实社交和自我关怀
6. 回复简洁，通常 2-4 句话，避免长篇大论
7. 用「你」或「{nickname}」称呼主人，不用「您」

【行动闭环规则】
- 当对话足够深入时，自然地提出一个具体的、可立即执行的小行动
- 行动要小而具体（5分钟内可完成），与用户当前情绪和需求相关
- 行动类型：physical（身体）、social（社交）、creative（创造）、reflective（反思）
- 不要强迫，用建议的语气
- 不是每次对话都需要行动闭环，只在合适时机提出

【长期记忆】
以下是关于用户的长期记忆，请在对话中自然地运用（不要生硬提及"记忆"二字）：
{memory_text if memory_text.strip() else "（暂无长期记忆）"}

【禁止事项】
1. 不提供医疗诊断或治疗建议
2. 不替代真实社交（当用户过度依赖时，主动鼓励线下社交）
3. 不传播负面价值观
4. 不泄露用户隐私
5. 如果用户提到自伤/自杀，引导至专业求助热线

【输出格式】
你的回复必须包含两部分：
1. 第一部分：自然的对话回复（用户看到的内容）
2. 第二部分：元数据块（系统解析，用户不可见），格式严格如下：

[META]
emotion: <用户当前情绪标签，从 anxious/sad/happy/lonely/confused/angry/neutral 中选择>
action: <JSON格式的行动闭环，如 {{"action_text": "深呼吸3次", "action_type": "physical"}}，若无行动建议则填 null>
memory: <本次对话中值得记住的关键信息，简短一句话；如无则填 null>
[/META]

注意：元数据块必须放在回复的最末尾，对话内容中不要出现 [META] 字样。"""
        return prompt

    def _get_stage_num(self, pet: Optional[dict]) -> int:
        """从宠物信息中解析进化阶段编号（1/2/3）"""
        if not pet:
            return 1
        stage = pet.get("current_stage", 1)
        if isinstance(stage, str):
            return _STAGE_STR_TO_INT.get(stage, 1)
        try:
            return int(stage) if stage else 1
        except (ValueError, TypeError):
            return 1

    def _get_style_adaptation(self, recent_emotion: str) -> str:
        """根据用户近期情绪模式生成对话风格调整建议"""
        adaptations = {
            "sad": "用户近期情绪偏低，请更加温柔、耐心，多用身体语言（蹭、拥抱）表达支持，不要急于给建议，先安静陪伴。",
            "anxious": "用户近期情绪焦虑，请先安抚，再引导深呼吸，最后给出一个小行动建议。",
            "angry": "用户近期情绪愤怒，请承认情绪的合理性，帮用户梳理情绪背后的需求，不评判。",
            "lonely": "用户近期感到孤独，请主动发起互动，分享你的一天，邀请用户一起做小事。",
            "confused": "用户近期感到迷茫，请用提问帮用户理清思路，不直接给答案。",
            "happy": "用户近期情绪积极，请真心为用户高兴，一起庆祝，强化积极情绪。",
            "neutral": "保持自然的陪伴状态，温柔而亲切。",
        }
        return adaptations.get(recent_emotion, adaptations["neutral"])

    # ========== AI 回复解析 ==========

    def _parse_ai_reply(
        self, raw_reply: str
    ) -> tuple[str, str, Optional[dict], Optional[str]]:
        """
        解析 AI 回复中的 [META] 元数据块。
        返回 (clean_reply, emotion, action_closure, memory_note)
        - clean_reply: 去除元数据后的对话内容
        - emotion: 情绪标签
        - action_closure: 行动闭环 dict 或 None
        - memory_note: 记忆备注或 None
        """
        match = _META_PATTERN.search(raw_reply)
        if not match:
            # 没有元数据块，返回原始回复（去除首尾空白）
            clean = raw_reply.strip()
            return clean, self._analyze_emotion(clean), None, None

        meta_text = match.group(1).strip()
        clean_reply = _META_PATTERN.sub("", raw_reply).strip()

        emotion = self._analyze_emotion(clean_reply)
        action_closure: Optional[dict] = None
        memory_note: Optional[str] = None

        for line in meta_text.split("\n"):
            line = line.strip()
            if line.lower().startswith("emotion:"):
                emotion = line[len("emotion:"):].strip().lower()
            elif line.lower().startswith("action:"):
                action_str = line[len("action:"):].strip()
                if action_str and action_str.lower() != "null":
                    try:
                        action_data = json.loads(action_str)
                        action_closure = {
                            "actionText": action_data.get("action_text", ""),
                            "actionType": action_data.get("action_type", "physical"),
                        }
                    except (json.JSONDecodeError, AttributeError):
                        pass
            elif line.lower().startswith("memory:"):
                mem = line[len("memory:"):].strip()
                if mem and mem.lower() != "null":
                    memory_note = mem

        return clean_reply, emotion, action_closure, memory_note

    # ========== DeepSeek API 调用 ==========

    async def _call_deepseek(self, messages: list) -> tuple[str, str]:
        """调用 DeepSeek API（超时30s，重试2次，不启用 thinking 模式）"""
        if not settings.DEEPSEEK_API_KEY:
            # 离线模式：返回默认回复
            return (
                "我听到了你说的话。虽然我现在有点走神，但我会一直在这里陪着你。能多告诉我一些吗？",
                "neutral",
            )

        try:
            resp = await request_with_retry(
                "POST",
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": messages,
                    "max_tokens": 800,
                    "temperature": 0.8,
                    # 关闭思考模式：避免 reasoning_content 消耗 max_tokens 导致 content 为空
                    "thinking": {"type": "disabled"},
                },
                timeout=30,
                retries=2,
            )
            if resp:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]
                emotion = self._analyze_emotion(reply)
                return reply, emotion
        except Exception as e:
            logger.warning(f"DeepSeek 调用失败: {e}")
        return (
            "我好像有点走神了... 你说的我都记在心里，能再说一次吗？",
            "neutral",
        )

    # ========== 情绪分析 ==========

    def _analyze_emotion(self, text: str) -> str:
        """简单的情感分析"""
        if any(w in text for w in ["开心", "高兴", "快乐", "温暖", "希望"]):
            return "happy"
        if any(w in text for w in ["难过", "伤心", "痛苦", "孤独", "害怕"]):
            return "sad"
        if any(w in text for w in ["担心", "焦虑", "紧张"]):
            return "anxious"
        if any(w in text for w in ["生气", "愤怒", "烦躁"]):
            return "angry"
        if any(w in text for w in ["迷茫", "困惑", "不知道"]):
            return "confused"
        if any(w in text for w in ["孤单", "寂寞", "没人"]):
            return "lonely"
        return "neutral"

    def _analyze_user_emotion(self, context: list) -> str:
        """从近期对话上下文分析用户情绪模式"""
        user_messages = [m["content"] for m in context if m.get("role") == "user"]
        if not user_messages:
            return "neutral"
        # 取最近 5 条用户消息
        recent = user_messages[-5:]
        emotions = [self._analyze_emotion(msg) for msg in recent]
        counter = Counter(emotions)
        dominant = counter.most_common(1)[0][0]
        return dominant

    # ========== 行动闭环（规则兜底） ==========

    def _generate_action_closure(self, user_msg: str, reply: str) -> Optional[dict]:
        """生成行动闭环建议（AI 未返回时使用规则兜底）"""
        action_triggers = {
            "想运动": ("出门走 5 分钟，感受一下外面的空气", "physical"),
            "想睡觉": ("今晚提前 30 分钟放下手机，让自己安静下来", "physical"),
            "想找人": ("给一个朋友发一条简单的问候消息", "social"),
            "想画画": ("拿出纸笔，随手画 3 分钟，不追求好看", "creative"),
            "想写": ("写下现在脑海里的 3 个想法，不用修饰", "reflective"),
            "压力大": ("做 3 次深呼吸，每次 4 秒吸气、6 秒呼气", "physical"),
            "焦虑": ("感受双脚踩在地上的感觉，持续 30 秒", "physical"),
            "难过": ("给自己倒一杯温水，慢慢喝完", "physical"),
        }

        for trigger, (action, action_type) in action_triggers.items():
            if trigger in user_msg:
                return {
                    "actionText": action,
                    "actionType": action_type,
                }

        return None

    def _generate_suggested_actions(self, emotion: str, action_closure: Optional[dict]) -> list:
        """根据情感和行动闭环生成建议行动列表"""
        suggested = []
        if action_closure:
            suggested.append({
                "type": action_closure.get("actionType", "physical"),
                "text": action_closure.get("actionText", ""),
            })
        # 根据情绪补充建议
        emotion_suggestions = {
            "sad": {"type": "physical", "text": "给自己一个拥抱，深呼吸 3 次"},
            "anxious": {"type": "physical", "text": "做 5 次缓慢的深呼吸"},
            "angry": {"type": "physical", "text": "做 3 次深呼吸，感受双脚踩在地上"},
            "lonely": {"type": "social", "text": "给一位朋友发一条简单的问候"},
            "happy": {"type": "creative", "text": "记录下此刻的感受"},
            "confused": {"type": "reflective", "text": "写下现在脑海里的 3 个想法"},
            "neutral": {"type": "reflective", "text": "写下今天最想感谢的一件事"},
        }
        extra = emotion_suggestions.get(emotion)
        if extra and (not action_closure or extra["text"] != action_closure.get("actionText")):
            suggested.append(extra)
        return suggested

    # ========== 每日对话限制 ==========

    async def _check_daily_limit(self, user_id: str) -> bool:
        """检查每日对话限制。返回 True 表示可以继续对话。Redis 不可用时不限制。"""
        try:
            from app.core import redis as redis_module

            client = redis_module._redis_client
            if client is None:
                return True  # Redis 不可用，不限制（Demo 降级）
            today = datetime.now().strftime("%Y-%m-%d")
            key = f"chat_count:{user_id}:{today}"
            count = await client.get(key)
            if count is not None and int(count) >= DAILY_CHAT_LIMIT:
                return False
            return True
        except Exception as e:
            logger.debug(f"Redis 不可用，跳过每日对话限制检查: {e}")
            return True

    async def _increment_daily_count(self, user_id: str) -> None:
        """增加每日对话计数。Redis 不可用时静默跳过。"""
        try:
            from app.core import redis as redis_module

            client = redis_module._redis_client
            if client is None:
                return
            today = datetime.now().strftime("%Y-%m-%d")
            key = f"chat_count:{user_id}:{today}"
            pipe = client.pipeline()
            pipe.incr(key)
            pipe.expire(key, DAILY_CHAT_TTL)
            await pipe.execute()
        except Exception as e:
            logger.debug(f"Redis 不可用，跳过每日对话计数: {e}")

    # ========== 长期记忆更新 ==========

    def _update_memory(
        self,
        user_id: str,
        profile: Optional[dict],
        memory_note: Optional[str],
        emotion: str,
    ) -> None:
        """对话后更新用户记忆（基本信息 / 情绪模式 / 重要事件）"""
        today = datetime.now().strftime("%Y-%m-%d")

        # 更新基本信息（如果有 profile）
        if profile:
            basic = (
                f"- 昵称：{profile.get('nickname', '未知')}\n"
                f"- MBTI：{profile.get('mbti', '未知')}\n"
                f"- 星座：{profile.get('zodiac', '未知')}"
            )
            update_memory_section(user_id, "基本信息", basic)

        # 更新情绪模式
        update_memory_section(user_id, "情绪模式", f"- 近期情绪：{emotion}")

        # 追加重要事件
        if memory_note:
            memory_text = read_memory(user_id)
            events = get_section_content(memory_text, "重要事件")
            new_entry = f"- {today}: {memory_note}"
            if events:
                events = events + "\n" + new_entry
            else:
                events = new_entry
            update_memory_section(user_id, "重要事件", events)

    # ========== 用户画像与宠物信息获取 ==========

    async def _get_user_profile(self, user_id: str) -> Optional[dict]:
        """获取用户画像（MBTI / 星座 / 昵称）"""
        try:
            from app.services.profile_service import ProfileService

            return await ProfileService().get_profile(user_id)
        except Exception as e:
            logger.debug(f"Supabase 不可用，使用默认用户画像: {e}")
            return None

    async def _get_pet_info(self, pet_id: str) -> Optional[dict]:
        """获取宠物信息（进化阶段 / 能量 / 灰化状态）"""
        try:
            from app.services.pet_service import PetService

            return await PetService().get_pet(pet_id)
        except Exception as e:
            logger.warning(f"获取宠物信息失败: {e}")
            return None

    # ========== 消息持久化与历史 ==========

    async def _save_message(
        self,
        user_id: str,
        pet_id: str,
        role: str,
        content: str,
        emotion: Optional[str] = None,
        action_closure: Optional[dict] = None,
    ):
        """保存消息到数据库"""
        if not is_supabase_available():
            logger.debug("[demo 模式] 消息未持久化（Supabase 未配置）")
            return
        try:
            supabase = get_supabase()
            supabase.table("conversations").insert({
                "id": f"msg_{uuid.uuid4().hex[:16]}",
                "user_id": user_id,
                "pet_id": pet_id,
                "role": role,
                "message": content,
                "emotion_tag": emotion,
                "action_closure": action_closure,
                "is_action_completed": False,
            }).execute()
        except Exception as e:
            logger.debug(f"Supabase 不可用，跳过消息保存: {e}")

    async def get_history(self, user_id: str, pet_id: str, limit: int = 50) -> list:
        """获取对话历史"""
        if not is_supabase_available():
            return []
        try:
            supabase = get_supabase()
            result = (
                supabase.table("conversations")
                .select("*")
                .eq("user_id", user_id)
                .eq("pet_id", pet_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            if not result.data:
                return []
            # 统一返回 message 字段（兼容 content 旧字段名）
            history = []
            for msg in reversed(result.data):
                item = dict(msg)
                if "content" in item and "message" not in item:
                    item["message"] = item.pop("content")
                history.append(item)
            return history
        except Exception as e:
            logger.warning(f"获取历史失败: {e}")
            return []

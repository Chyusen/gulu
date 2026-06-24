"""
咕噜 Gulu — 宠物服务
对应需求文档 三、宠物生成系统 / 四、灵魂镜像养成系统
v2.0 新增 create_pet / generate_image_task / poll_image_task（对齐 API 2/3）
v2.1 新增：Supabase 未配置时的内存降级方案（demo 模式）
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
import httpx
from app.core.config import settings
from app.core.database import get_supabase, is_supabase_available
from app.services.image_service import ImageService
from app.services.profile_service import MBTI_PET_TRAITS, MBTI_ANALYSIS, _mock_users

logger = logging.getLogger(__name__)

# demo 模式内存存储
_mock_pets: dict = {}
_mock_image_tasks: dict = {}


# 阶段映射：数据库 current_stage 整数 ↔ 前端字符串
STAGE_INT_TO_STR = {1: "baby", 2: "adult", 3: "divine"}
STAGE_STR_TO_INT = {v: k for k, v in STAGE_INT_TO_STR.items()}


# 喂食能量加成
FEED_ENERGY = {
    "sunlight": 20,
    "moonlight": 20,
    "soul_feast": 50,
    "forget_grass": 30,
}

# 宠物回应
FEED_RESPONSES = {
    "sunlight": "好温暖的阳光！我感觉充满了力量～",
    "moonlight": "月光好柔和，谢谢你～",
    "soul_feast": "哇，灵魂盛宴！这是最棒的礼物！",
    "forget_grass": "忘忧草的味道让我安心了许多...",
}

HEAL_RESPONSES = {
    "breathing": "深呼吸...我感觉好多了。你也一起深呼吸吧～",
    "look_green": "看看绿色，心情平静了不少呢～",
    "walk": "散步真好，身上的荆棘好像少了一些～",
    "meditation": "冥想让我重新找回了内心的光～",
}


def _build_personality_type(mbti: Optional[str], zodiac: Optional[str]) -> str:
    """
    根据用户 MBTI + 星座生成 personality_type 字符串。
    对齐需求文档 7.2：personality_type 例如 "INFJ-摩羯型灵魂镜"。
    """
    mbti_part = mbti.upper() if mbti else "SOUL"
    zodiac_part = ""
    if zodiac and zodiac.endswith("座"):
        # 去掉"座"字，如"摩羯座" → "摩羯"
        zodiac_part = zodiac[:-1]
    else:
        zodiac_part = zodiac or "星"

    # 根据 MBTI 推断一个灵魂类型词
    soul_word_map = {
        "INFP": "理想镜", "INFJ": "灵魂镜", "INTP": "思考镜", "INTJ": "战略镜",
        "ISFP": "艺术镜", "ISFJ": "守护镜", "ISTP": "匠人镜", "ISTJ": "秩序镜",
        "ENFP": "火花镜", "ENFJ": "引路镜", "ENTP": "辩论镜", "ENTJ": "指挥镜",
        "ESFP": "表演镜", "ESFJ": "主人镜", "ESTP": "冒险镜", "ESTJ": "管家镜",
    }
    soul_word = soul_word_map.get(mbti_part, "灵魂镜")
    return f"{mbti_part}-{zodiac_part}型{soul_word}"


class PetService:
    def __init__(self):
        self.image_service = ImageService()

    # ========== v2.0 新增：API 3 创建宠物 ==========

    async def create_pet(
        self,
        user_id: str,
        name: str,
        style: str,
        custom_description: Optional[str] = None,
        image_task_id: Optional[str] = None,
    ) -> dict:
        """
        创建宠物（v2.0 API 3：POST /api/v1/pets）。
        - 从当前登录用户获取 user_id（由路由层注入）。
        - 根据 user.mbti + user.zodiac 生成 personality_type。
        - 默认 stage='baby'，energy_level=80。
        - 若传入 image_task_id，查询任务结果并使用 image_url；否则使用默认占位图。
        - Supabase 未配置时使用内存降级（demo 模式）。
        """
        # 读取用户画像
        mbti: Optional[str] = None
        zodiac: Optional[str] = None

        if is_supabase_available():
            try:
                supabase = get_supabase()
                user_result = (
                    supabase.table("users")
                    .select("mbti, zodiac")
                    .eq("id", user_id)
                    .execute()
                )
                if user_result.data:
                    mbti = user_result.data[0].get("mbti")
                    zodiac = user_result.data[0].get("zodiac")
            except Exception as e:
                logger.warning(f"读取用户画像失败，使用默认性格: {e}")
        else:
            # demo 模式：从内存读取
            mock_user = _mock_users.get(user_id)
            if mock_user:
                mbti = mock_user.get("mbti")
                zodiac = mock_user.get("zodiac")

        personality_type = _build_personality_type(mbti, zodiac)

        # 解析图片 URL
        image_url: Optional[str] = None
        if image_task_id:
            image_url = await self._get_task_image_url(image_task_id)
        if not image_url:
            image_url = self.image_service.default_placeholder_url()

        pet_id = f"pet_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        pet_row = {
            "id": pet_id,
            "user_id": user_id,
            "name": name,
            "personality_type": personality_type,
            "current_stage": "baby",
            "stage_number": 1,
            "energy_level": 80,
            "max_energy": 100,
            "style": style,
            "custom_description": custom_description,
            "image_url": image_url,
            "action_closure_count": 0,
            "created_at": now_iso,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("pets").insert({
                    **pet_row,
                    "current_stage": 1,  # DB 存整数
                }).execute()
            except Exception as e:
                logger.exception(f"保存宠物到数据库失败，降级到内存模式: {e}")
                _mock_pets[pet_id] = pet_row
        else:
            _mock_pets[pet_id] = pet_row
            logger.info(f"[demo 模式] 宠物已保存到内存: {pet_id}")

        return pet_row

    async def _get_task_image_url(self, task_id: str) -> Optional[str]:
        """根据任务 ID 查询已完成的图片 URL"""
        # demo 模式：从内存读取
        if not is_supabase_available():
            task = _mock_image_tasks.get(task_id)
            if task and task.get("status") == "completed":
                return task.get("image_url")
            return None

        try:
            supabase = get_supabase()
            result = (
                supabase.table("image_generation_tasks")
                .select("status, image_url")
                .eq("id", task_id)
                .execute()
            )
            if result.data:
                row = result.data[0]
                if row.get("status") == "completed":
                    return row.get("image_url")
        except Exception as e:
            logger.warning(f"查询图片任务失败: {e}")
        return None

    # ========== v2.0 新增：API 2 AI 形象生成 ==========

    async def create_image_task(
        self,
        style: str,
        custom_prompt: Optional[str] = None,
        mbti: Optional[str] = None,
        zodiac: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> dict:
        """
        创建图像生成任务（v2.0 API 2：POST /api/v1/pets/generate-image）。
        - 同步快速返回 task_id，状态为 pending。
        - 真正的生成在后台执行（此处简化为同步触发，但立即返回 task_id）。
        - Supabase 未配置时使用内存降级（demo 模式）。
        """
        task_id = str(uuid.uuid4())

        # demo 模式：任务存内存
        if not is_supabase_available():
            return await self._mock_create_image_task(
                task_id, style, custom_prompt, mbti, zodiac, user_id
            )

        # 先落库 pending 状态
        try:
            supabase = get_supabase()
            supabase.table("image_generation_tasks").insert({
                "id": task_id,
                "user_id": user_id,
                "style": style,
                "custom_prompt": custom_prompt,
                "status": "pending",
            }).execute()
        except Exception as e:
            logger.exception(f"创建图像任务失败，降级到内存模式: {e}")
            return await self._mock_create_image_task(
                task_id, style, custom_prompt, mbti, zodiac, user_id
            )

        # 后台异步触发生成（不阻塞响应）
        # 简化处理：直接 await 生成，但若超时则任务保持 generating
        try:
            # 标记为 generating
            await self._update_task_status(task_id, "generating")

            image_url, prompt_used = await self.image_service.generate_pet_image_with_prompt(
                style=style,
                custom_description=custom_prompt,
                mbti=mbti,
                zodiac=zodiac,
            )

            await self._update_task_status(
                task_id, "completed",
                image_url=image_url,
                prompt_used=prompt_used,
            )
            return {
                "task_id": task_id,
                "status": "completed",
                "image_url": image_url,
                "prompt_used": prompt_used,
            }
        except Exception as e:
            logger.exception(f"图像生成失败: {e}")
            await self._update_task_status(
                task_id, "failed",
                error_msg=str(e),
                image_url=self.image_service.default_placeholder_url(),
            )
            return {
                "task_id": task_id,
                "status": "failed",
                "image_url": self.image_service.default_placeholder_url(),
                "prompt_used": None,
                "error_msg": str(e),
            }

    async def _mock_create_image_task(
        self,
        task_id: str,
        style: str,
        custom_prompt: Optional[str],
        mbti: Optional[str],
        zodiac: Optional[str],
        user_id: Optional[str],
    ) -> dict:
        """demo 模式：内存中创建图像生成任务"""
        logger.info(f"[demo 模式] 图像任务已创建到内存: {task_id}")

        try:
            image_url, prompt_used = await self.image_service.generate_pet_image_with_prompt(
                style=style,
                custom_description=custom_prompt,
                mbti=mbti,
                zodiac=zodiac,
            )
            _mock_image_tasks[task_id] = {
                "task_id": task_id,
                "status": "completed",
                "image_url": image_url,
                "prompt_used": prompt_used,
                "error_msg": None,
            }
            return _mock_image_tasks[task_id]
        except Exception as e:
            logger.exception(f"[demo 模式] 图像生成失败: {e}")
            placeholder = self.image_service.default_placeholder_url()
            _mock_image_tasks[task_id] = {
                "task_id": task_id,
                "status": "failed",
                "image_url": placeholder,
                "prompt_used": None,
                "error_msg": str(e),
            }
            return _mock_image_tasks[task_id]

    async def poll_image_task(self, task_id: str) -> Optional[dict]:
        """轮询查询任务状态（v2.0 API 2：GET /api/v1/pets/generate-image/{task_id}）"""
        # demo 模式：从内存读取
        if not is_supabase_available():
            return _mock_image_tasks.get(task_id)

        try:
            supabase = get_supabase()
            result = (
                supabase.table("image_generation_tasks")
                .select("id, status, image_url, prompt_used, error_msg")
                .eq("id", task_id)
                .execute()
            )
            if not result.data:
                return None
            row = result.data[0]
            return {
                "task_id": row["id"],
                "status": row.get("status", "pending"),
                "image_url": row.get("image_url"),
                "prompt_used": row.get("prompt_used"),
                "error_msg": row.get("error_msg"),
            }
        except Exception as e:
            logger.exception(f"查询图像任务失败，降级到内存模式: {e}")
            return _mock_image_tasks.get(task_id)

    async def _update_task_status(
        self,
        task_id: str,
        status: str,
        image_url: Optional[str] = None,
        prompt_used: Optional[str] = None,
        error_msg: Optional[str] = None,
    ) -> None:
        """更新任务状态"""
        update_data: dict = {"status": status}
        if image_url is not None:
            update_data["image_url"] = image_url
        if prompt_used is not None:
            update_data["prompt_used"] = prompt_used
        if error_msg is not None:
            update_data["error_msg"] = error_msg

        if not is_supabase_available():
            # demo 模式：更新内存
            if task_id in _mock_image_tasks:
                _mock_image_tasks[task_id].update(update_data)
            return

        try:
            supabase = get_supabase()
            supabase.table("image_generation_tasks").update(update_data).eq("id", task_id).execute()
        except Exception as e:
            logger.warning(f"更新任务状态失败: {e}")

    # ========== 旧版接口保留兼容 ==========

    async def generate_pet(self, data) -> dict:
        """AI 生成宠物形象"""
        pet_id = f"pet_{uuid.uuid4().hex[:12]}"

        # 根据用户画像的 MBTI 匹配宠物性格
        personality_type = "dreamer"
        personality_description = "温柔的灵魂伙伴"
        try:
            supabase = get_supabase()
            user_result = (
                supabase.table("users")
                .select("mbti")
                .eq("id", data.user_id)
                .execute()
            )
            if user_result.data:
                mbti = user_result.data[0].get("mbti")
                if mbti:
                    traits = MBTI_PET_TRAITS.get(mbti)
                    if traits:
                        personality_type = traits["personality_type"]
                        personality_description = traits["description"]
        except Exception as e:
            print(f"[WARN]  读取用户画像失败，使用默认性格: {e}")

        # 调用 SiliconFlow SD 生成图片
        image_url = await self.image_service.generate_pet_image(
            style=data.style,
            custom_description=data.custom_description,
        )

        pet_data = {
            "id": pet_id,
            "userId": data.user_id,
            "user_id": data.user_id,
            "name": data.name or "咕噜",
            "personality_type": personality_type,
            "personalityType": personality_type,
            "current_stage": "baby",
            "currentStage": "baby",
            "stage_number": 1,
            "stageNumber": 1,
            "energy_level": 80,
            "energyLevel": 80,
            "max_energy": 100,
            "maxEnergy": 100,
            "is_graying": False,
            "isGraying": False,
            "graying_severity": 0,
            "grayingSeverity": 0,
            "grayingExperienced": False,
            "grayingHealed": False,
            "is_dormant": False,
            "isDormant": False,
            "style": data.style,
            "custom_description": data.custom_description,
            "customDescription": data.custom_description,
            "voice_type": "cute_child",
            "voiceType": "cute_child",
            "voice_speed": 1.0,
            "voiceSpeed": 1.0,
            "current_emotion": "happy",
            "currentEmotion": "happy",
            "image_url": image_url,
            "imageUrl": image_url,
            "action_closure_count": 0,
            "actionClosureCount": 0,
            "collectibles": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "lastInteraction": datetime.now(timezone.utc).isoformat(),
        }

        # 保存到数据库
        try:
            if is_supabase_available():
                supabase = get_supabase()
                supabase.table("pets").insert({
                    "id": pet_id,
                    "user_id": data.user_id,
                    "name": data.name or "咕噜",
                    "personality_type": personality_type,
                    "current_stage": 1,
                    "energy_level": 80,
                    "max_energy": 100,
                    "is_graying": False,
                    "graying_severity": 0,
                    "is_dormant": False,
                    "style": data.style,
                    "custom_description": data.custom_description,
                    "voice_type": "cute_child",
                    "voice_speed": 1.0,
                    "image_url": image_url,
                    "action_closure_count": 0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
        except Exception as e:
            print(f"[WARN]  保存宠物失败: {e}")

        pet_data["personality_description"] = personality_description
        return pet_data

    async def get_pet(self, pet_id: str) -> Optional[dict]:
        """获取宠物信息"""
        try:
            supabase = get_supabase()
            result = supabase.table("pets").select("*").eq("id", pet_id).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            # Supabase 不可用时静默降级
            pass
        return None

    async def feed(self, pet_id: str, feed_type: str) -> dict:
        """喂食"""
        pet = await self.get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        # 灵魂盛宴需要完成行动闭环
        if feed_type == "soul_feast" and pet.get("action_closure_count", 0) < 1:
            return {
                "energy_level": pet["energy_level"],
                "message": "需要完成行动闭环后才能使用灵魂盛宴",
                "pet_response": "我还不能吃灵魂盛宴哦，先完成一个行动吧～",
            }

        gain = FEED_ENERGY.get(feed_type, 20)
        new_energy = min(100, pet["energy_level"] + gain)

        # 更新数据库
        try:
            supabase = get_supabase()
            supabase.table("pets").update({
                "energy_level": new_energy,
                "last_interaction": datetime.now(timezone.utc).isoformat(),
            }).eq("id", pet_id).execute()
        except Exception as e:
            print(f"[WARN]  更新宠物能量失败: {e}")

        return {
            "energy_level": new_energy,
            "message": f"能量 +{gain}",
            "pet_response": FEED_RESPONSES.get(feed_type, "谢谢你的食物！"),
        }

    async def heal(self, pet_id: str, action: str) -> dict:
        """治疗灰化症"""
        pet = await self.get_pet(pet_id)
        if not pet:
            raise ValueError("宠物不存在")

        if not pet.get("is_graying"):
            return {
                "graying_severity": 0,
                "is_healed": True,
                "pet_response": "我很健康哦，没有灰化～",
            }

        new_severity = max(0, pet.get("graying_severity", 0) - 1)
        is_healed = new_severity == 0

        try:
            supabase = get_supabase()
            update_data = {
                "graying_severity": new_severity,
                "is_graying": not is_healed,
            }
            if is_healed:
                update_data["graying_healed"] = True
            supabase.table("pets").update(update_data).eq("id", pet_id).execute()
        except Exception as e:
            print(f"[WARN]  治疗失败: {e}")

        return {
            "graying_severity": new_severity,
            "is_healed": is_healed,
            "pet_response": HEAL_RESPONSES.get(action, "感觉好多了～"),
        }

    async def interact(self, pet_id: str, interaction_type: str) -> dict:
        """互动"""
        responses = {
            "pet": {"pet_emotion": "happy", "animation_trigger": "pet_happy", "sound_url": "sfx_pet.wav"},
            "poke": {"pet_emotion": "excited", "animation_trigger": "pet_play", "sound_url": "sfx_pet.wav"},
            "hug": {"pet_emotion": "happy", "animation_trigger": "pet_happy", "sound_url": "sfx_pet.wav"},
            "wake": {"pet_emotion": "normal", "animation_trigger": "pet_idle", "sound_url": "sfx_pet.wav"},
        }
        return responses.get(interaction_type, responses["pet"])

    async def update_style(self, pet_id: str, style: str) -> Optional[dict]:
        """切换风格"""
        try:
            supabase = get_supabase()
            result = supabase.table("pets").update({"style": style}).eq("id", pet_id).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            print(f"[WARN]  更新风格失败: {e}")
        return None

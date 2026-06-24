"""
咕噜 Gulu — 好友系统服务
对应需求文档 六、社交安全与好友
实现 API 16
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from app.core.database import get_supabase, is_supabase_available

logger = logging.getLogger(__name__)

# demo 模式内存存储
_mock_friends: dict = {}  # {user_id: [{"user_id":..., "nickname":..., "pet_name":..., "is_online":...}]}
_mock_blocked: dict = {}  # {user_id: [blocked_id, ...]}
_mock_reports: list = []

# Mock 好友数据
_MOCK_FRIENDS_POOL = [
    {"user_id": "u_mock_1", "nickname": "小月", "pet_name": "棉花", "is_online": True},
    {"user_id": "u_mock_2", "nickname": "小星", "pet_name": "团子", "is_online": False},
    {"user_id": "u_mock_3", "nickname": "阿阳", "pet_name": "豆豆", "is_online": True},
]


class FriendService:
    """好友系统服务"""

    async def get_friends(self, user_id: str) -> dict:
        """获取好友列表"""
        friends = []

        if is_supabase_available():
            try:
                supabase = get_supabase()
                result = (
                    supabase.table("friends")
                    .select("friend_id, users!friend_friend_id_fkey(id, nickname, pets(name))")
                    .eq("user_id", user_id)
                    .execute()
                )
                for row in result.data or []:
                    friend_info = row.get("users") or {}
                    pets = friend_info.get("pets") or []
                    pet_name = pets[0]["name"] if pets else None
                    friends.append({
                        "user_id": friend_info.get("id", ""),
                        "nickname": friend_info.get("nickname", ""),
                        "pet_name": pet_name,
                        "is_online": True,  # Demo: 默认在线
                    })
            except Exception as e:
                logger.warning(f"获取好友列表失败，降级到 Mock: {e}")
                friends = list(_MOCK_FRIENDS_POOL)
        else:
            friends = _mock_friends.get(user_id, list(_MOCK_FRIENDS_POOL))

        return {"friends": friends}

    async def add_friend(self, user_id: str, target_user_id: str) -> dict:
        """添加好友"""
        if user_id == target_user_id:
            raise ValueError("不能添加自己为好友")

        # 检查是否已拉黑
        blocked = await self._get_blocked_list(user_id)
        if target_user_id in blocked:
            raise ValueError("该用户已被你拉黑，请先取消拉黑")

        # 检查是否已是好友
        friends_result = await self.get_friends(user_id)
        existing_ids = [f["user_id"] for f in friends_result.get("friends", [])]
        if target_user_id in existing_ids:
            raise ValueError("已经是好友了")

        # 添加好友
        friend_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "friend_id": target_user_id,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("friends").insert(friend_data).execute()
            except Exception as e:
                logger.warning(f"添加好友失败，降级到内存: {e}")
                self._mock_add_friend(user_id, target_user_id)
        else:
            self._mock_add_friend(user_id, target_user_id)

        return {"message": "添加成功"}

    async def block_user(self, user_id: str, target_user_id: str) -> dict:
        """拉黑用户"""
        if user_id == target_user_id:
            raise ValueError("不能拉黑自己")

        block_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "blocked_id": target_user_id,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("block_list").upsert(block_data).execute()
                # 同时删除好友关系
                supabase.table("friends").delete().eq("user_id", user_id).eq("friend_id", target_user_id).execute()
                supabase.table("friends").delete().eq("user_id", target_user_id).eq("friend_id", user_id).execute()
            except Exception as e:
                logger.warning(f"拉黑失败，降级到内存: {e}")
                self._mock_block(user_id, target_user_id)
        else:
            self._mock_block(user_id, target_user_id)

        return {"message": "已拉黑"}

    async def report_user(
        self,
        reporter_id: str,
        target_id: str,
        reason: str,
        description: Optional[str] = None,
    ) -> dict:
        """举报用户"""
        report_data = {
            "id": str(uuid.uuid4()),
            "reporter_id": reporter_id,
            "target_id": target_id,
            "reason": reason,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("reports").insert(report_data).execute()
            except Exception as e:
                logger.warning(f"举报失败，降级到内存: {e}")
                _mock_reports.append(report_data)
        else:
            _mock_reports.append(report_data)

        return {"message": "举报已提交，我们会尽快处理"}

    async def get_blocked_list(self, user_id: str) -> list:
        """获取拉黑列表"""
        return await self._get_blocked_list(user_id)

    async def _get_blocked_list(self, user_id: str) -> list:
        """获取拉黑 ID 列表"""
        if is_supabase_available():
            try:
                supabase = get_supabase()
                result = (
                    supabase.table("block_list")
                    .select("blocked_id")
                    .eq("user_id", user_id)
                    .execute()
                )
                return [r["blocked_id"] for r in result.data or []]
            except Exception as e:
                logger.warning(f"获取拉黑列表失败: {e}")
                return _mock_blocked.get(user_id, [])
        return _mock_blocked.get(user_id, [])

    # ========== 探索隐私设置 ==========

    async def get_explore_privacy(self, user_id: str) -> dict:
        """获取探索隐私设置"""
        if is_supabase_available():
            try:
                supabase = get_supabase()
                result = supabase.table("explore_privacy").select("*").eq("user_id", user_id).execute()
                if result.data:
                    row = result.data[0]
                    return {
                        "show_gender": row.get("show_gender", False),
                        "show_mbti": row.get("show_mbti", False),
                        "show_zodiac": row.get("show_zodiac", False),
                        "first_visit_done": row.get("first_visit_done", False),
                    }
            except Exception as e:
                logger.warning(f"获取隐私设置失败: {e}")

        return {
            "show_gender": False,
            "show_mbti": False,
            "show_zodiac": False,
            "first_visit_done": False,
        }

    async def update_explore_privacy(
        self,
        user_id: str,
        show_gender: bool = False,
        show_mbti: bool = False,
        show_zodiac: bool = False,
    ) -> dict:
        """更新探索隐私设置"""
        data = {
            "user_id": user_id,
            "show_gender": show_gender,
            "show_mbti": show_mbti,
            "show_zodiac": show_zodiac,
            "first_visit_done": True,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("explore_privacy").upsert(data).execute()
            except Exception as e:
                logger.warning(f"更新隐私设置失败: {e}")

        return data

    # ========== Mock 内部方法 ==========

    def _mock_add_friend(self, user_id: str, target_id: str) -> None:
        if user_id not in _mock_friends:
            _mock_friends[user_id] = []
        _mock_friends[user_id].append({
            "user_id": target_id,
            "nickname": f"用户{target_id[-4:]}",
            "pet_name": "咕噜",
            "is_online": True,
        })

    def _mock_block(self, user_id: str, target_id: str) -> None:
        if user_id not in _mock_blocked:
            _mock_blocked[user_id] = []
        if target_id not in _mock_blocked[user_id]:
            _mock_blocked[user_id].append(target_id)
        # 从好友列表移除
        if user_id in _mock_friends:
            _mock_friends[user_id] = [
                f for f in _mock_friends[user_id] if f["user_id"] != target_id
            ]

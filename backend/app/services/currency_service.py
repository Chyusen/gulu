"""
咕噜 Gulu — 货币服务
对应需求文档 3.1 双货币体系 / 3.4 货币数据源统一
实现 API 7
"""

import uuid
import logging
from typing import Optional
from app.core.database import get_supabase, is_supabase_available

logger = logging.getLogger(__name__)

# demo 模式内存存储
_mock_currency: dict = {}  # {user_id: {"gulu_coin": 0, "star_dust": 0}}
_mock_currency_logs: list = []


class CurrencyService:
    """货币管理服务"""

    async def get_balance(self, user_id: str) -> dict:
        """获取用户货币余额"""
        if not is_supabase_available():
            balance = _mock_currency.get(user_id, {"gulu_coin": 0, "star_dust": 0})
            return {"gulu_coin": balance.get("gulu_coin", 0), "star_dust": balance.get("star_dust", 0)}

        try:
            supabase = get_supabase()
            result = supabase.table("users").select("gulu_coin, star_dust").eq("id", user_id).execute()
            if result.data:
                return {
                    "gulu_coin": result.data[0].get("gulu_coin", 0),
                    "star_dust": result.data[0].get("star_dust", 0),
                }
        except Exception as e:
            logger.warning(f"获取货币余额失败，降级到内存模式: {e}")

        balance = _mock_currency.get(user_id, {"gulu_coin": 0, "star_dust": 0})
        return {"gulu_coin": balance.get("gulu_coin", 0), "star_dust": balance.get("star_dust", 0)}

    async def operate_currency(
        self,
        user_id: str,
        currency_type: str,
        amount: int,
        operation: str,
        reason: str,
    ) -> dict:
        """
        货币操作（增加/消耗）。
        operation=spend 时检查余额，不足抛出 ValueError。
        返回更新后的余额。
        """
        balance = await self.get_balance(user_id)
        current = balance.get(currency_type, 0)

        if operation == "spend":
            if current < amount:
                raise ValueError(f"{currency_type} 余额不足（当前 {current}，需要 {amount}）")
            new_amount = current - amount
        elif operation == "add":
            new_amount = current + amount
        else:
            raise ValueError(f"无效操作: {operation}")

        # 更新余额
        await self._update_balance(user_id, currency_type, new_amount)

        # 记录日志
        await self._log_currency(user_id, currency_type, amount, operation, reason)

        return await self.get_balance(user_id)

    async def _update_balance(self, user_id: str, currency_type: str, new_amount: int) -> None:
        """更新货币余额"""
        if not is_supabase_available():
            if user_id not in _mock_currency:
                _mock_currency[user_id] = {"gulu_coin": 0, "star_dust": 0}
            _mock_currency[user_id][currency_type] = new_amount
            return

        try:
            supabase = get_supabase()
            supabase.table("users").update({currency_type: new_amount}).eq("id", user_id).execute()
        except Exception as e:
            logger.warning(f"更新货币余额失败，降级到内存模式: {e}")
            if user_id not in _mock_currency:
                _mock_currency[user_id] = {"gulu_coin": 0, "star_dust": 0}
            _mock_currency[user_id][currency_type] = new_amount

    async def _log_currency(
        self,
        user_id: str,
        currency_type: str,
        amount: int,
        operation: str,
        reason: str,
    ) -> None:
        """记录货币变动日志"""
        log_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency_type": currency_type,
            "amount": amount,
            "operation": operation,
            "reason": reason,
        }

        if is_supabase_available():
            try:
                supabase = get_supabase()
                supabase.table("currency_logs").insert(log_data).execute()
            except Exception as e:
                logger.warning(f"记录货币日志失败: {e}")
        else:
            _mock_currency_logs.append(log_data)

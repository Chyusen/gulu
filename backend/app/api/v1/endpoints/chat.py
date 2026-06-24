"""
咕噜 Gulu — 对话接口
对应需求文档 5.3 对话接口
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.chat_service import ChatService

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    user_id: str
    pet_id: str
    message: str
    context_length: Optional[int] = 10


@router.post("")
async def send_message(data: ChatRequest):
    """发送消息并获取 AI 回复"""
    service = ChatService()
    try:
        result = await service.send_message(data)
        return result
    except Exception as e:
        # 记录完整错误日志，但不向客户端泄露内部信息
        logger.exception("send_message 处理失败: %s", e)
        raise HTTPException(status_code=500, detail="服务暂时不可用，请稍后再试")


@router.get("/history")
async def get_history(user_id: str, pet_id: str, limit: int = 50):
    """获取对话历史"""
    service = ChatService()
    result = await service.get_history(user_id, pet_id, limit)
    return {"messages": result}

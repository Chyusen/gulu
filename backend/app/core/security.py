"""
咕噜 Gulu — 鉴权依赖
提供 JWT Bearer 鉴权与 get_current_user_id 依赖。
- 当配置了 JWT_SECRET（或 Supabase JWT Secret）时，从 Authorization: Bearer <token> 解析用户身份。
- 未配置 JWT_SECRET 时降级为从请求体获取 user_id，保持兼容。
"""

import base64
import hashlib
import hmac
import json
import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class _UserBody(BaseModel):
    """兼容降级模式：从请求体读取 user_id"""
    user_id: Optional[str] = None


def _b64url_decode(data: str) -> bytes:
    """Base64url 解码（自动补齐 padding）"""
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _decode_jwt_unverified(token: str) -> dict:
    """不校验签名地解码 JWT payload（仅用于降级或调试）"""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        payload = _b64url_decode(parts[1])
        return json.loads(payload)
    except Exception as e:
        logger.warning(f"解码 JWT payload 失败: {e}")
        return {}


def _decode_jwt(token: str, secret: str) -> dict:
    """解码并校验 JWT（HS256）"""
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="无效的 Token 格式")
    header_b64, payload_b64, signature_b64 = parts
    try:
        header = json.loads(_b64url_decode(header_b64))
    except Exception:
        raise HTTPException(status_code=401, detail="无效的 Token 头部")
    alg = header.get("alg", "HS256")
    if alg != "HS256":
        # 不支持的算法，降级为不校验签名
        logger.warning(f"不支持的 JWT 算法: {alg}，将不校验签名")
        return _decode_jwt_unverified(token)

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b"=").decode("ascii")
    if not hmac.compare_digest(expected_sig_b64, signature_b64):
        raise HTTPException(status_code=401, detail="Token 签名校验失败")

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception:
        raise HTTPException(status_code=401, detail="无效的 Token 载荷")
    return payload


def _get_jwt_secret() -> str:
    """获取用于校验 JWT 的密钥"""
    return settings.SUPABASE_JWT_SECRET or getattr(settings, "JWT_SECRET", "") or ""


async def get_current_user_id(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> str:
    """
    获取当前用户 ID。
    - 优先从 Authorization: Bearer <token> 解析。
    - 未配置 JWT_SECRET 时降级为从请求体 user_id 读取（保持兼容）。
    """
    secret = _get_jwt_secret()

    # 1. 优先使用 Bearer Token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if secret:
            payload = _decode_jwt(token, secret)
        else:
            # 未配置密钥：仅解码不校验签名（开发/兼容模式）
            payload = _decode_jwt_unverified(token)
        user_id = (
            payload.get("sub")
            or payload.get("user_id")
            or payload.get("uid")
        )
        if user_id:
            return str(user_id)
        raise HTTPException(status_code=401, detail="Token 中未找到用户标识")

    # 2. 降级：从请求体获取 user_id
    if not secret:
        try:
            body = await request.json()
        except Exception:
            body = {}
        user_id = body.get("user_id") if isinstance(body, dict) else None
        if user_id:
            return str(user_id)
        # 也尝试表单字段
        try:
            form = await request.form()
            user_id = form.get("user_id")
        except Exception:
            user_id = None
        if user_id:
            return str(user_id)
        raise HTTPException(status_code=401, detail="未提供有效的用户身份信息")

    raise HTTPException(status_code=401, detail="缺少 Authorization 头")

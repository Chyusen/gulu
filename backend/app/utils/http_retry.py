"""
咕噜 Gulu — HTTP 请求重试工具
对应后端 Agent 开发 Prompt 红线 7：外部 API 必须有超时与重试 — timeout 5s，重试 2 次
"""

import asyncio
import logging
from typing import Optional, Callable, Any
import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 5.0
DEFAULT_RETRIES = 2
RETRY_DELAY = 0.5  # 重试间隔（秒）


async def request_with_retry(
    method: str,
    url: str,
    *,
    headers: Optional[dict] = None,
    json: Optional[dict] = None,
    params: Optional[dict] = None,
    timeout: float = DEFAULT_TIMEOUT,
    retries: int = DEFAULT_RETRIES,
) -> Optional[httpx.Response]:
    """
    带重试的 HTTP 请求。
    - 超时或网络错误时自动重试。
    - 4xx 错误不重试（客户端错误）。
    - 5xx 错误重试。
    - 返回 None 表示所有重试均失败。
    """
    last_error: Optional[Exception] = None

    for attempt in range(retries + 1):
        try:
            # trust_env=False：不读取系统代理（避免本地代理导致 TLS 握手失败）
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                resp = await client.request(
                    method,
                    url,
                    headers=headers,
                    json=json,
                    params=params,
                )
                # 5xx 错误重试
                if resp.status_code >= 500 and attempt < retries:
                    logger.warning(
                        f"HTTP {resp.status_code} 错误，第 {attempt + 1} 次重试: {url}"
                    )
                    await asyncio.sleep(RETRY_DELAY)
                    continue
                resp.raise_for_status()
                return resp
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_error = e
            if attempt < retries:
                logger.warning(
                    f"网络错误（{type(e).__name__}），第 {attempt + 1} 次重试: {url}"
                )
                await asyncio.sleep(RETRY_DELAY)
            else:
                logger.error(f"HTTP 请求最终失败（{retries + 1} 次尝试）: {url} - {e}")
        except httpx.HTTPStatusError as e:
            # 4xx 错误不重试，直接返回 None
            logger.warning(f"HTTP {e.response.status_code} 错误（不重试）: {url}")
            return None
        except Exception as e:
            last_error = e
            if attempt < retries:
                logger.warning(
                    f"未知错误（{type(e).__name__}），第 {attempt + 1} 次重试: {url}"
                )
                await asyncio.sleep(RETRY_DELAY)
            else:
                logger.error(f"HTTP 请求最终失败: {url} - {e}")

    return None

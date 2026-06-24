"""
咕噜 Gulu — 统一响应格式
对应后端 Agent 开发 Prompt 红线 5：必须返回统一响应格式
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class ErrorCode:
    """错误码常量"""
    OK = 0
    INVALID_PARAM = 1001
    NOT_FOUND = 1002
    UNAUTHORIZED = 1003
    FORBIDDEN = 1004
    INTERNAL_ERROR = 2001
    EXTERNAL_API_ERROR = 2002
    GENERATION_FAILED = 2003


class ApiResponse(BaseModel):
    """统一响应格式：{ code, data, message }"""
    code: int = Field(default=ErrorCode.OK, description="0 表示成功，非 0 表示错误")
    data: Optional[Any] = Field(default=None, description="业务数据")
    message: str = Field(default="success", description="提示信息")

    @classmethod
    def success(cls, data: Any = None, message: str = "success") -> "ApiResponse":
        return cls(code=ErrorCode.OK, data=data, message=message)

    @classmethod
    def error(cls, code: int = ErrorCode.INTERNAL_ERROR, message: str = "error", data: Any = None) -> "ApiResponse":
        return cls(code=code, data=data, message=message)

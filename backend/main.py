"""
咕噜 Gulu — FastAPI 主入口
对应需求文档 1.1.7 初始化 FastAPI 项目
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.redis import init_redis

app = FastAPI(
    title="咕噜 Gulu API",
    description="带游戏功能的疗愈 App 后端",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    await init_db()
    await init_redis()
    print(f"[START] 咕噜 Gulu API 启动成功 - {settings.APP_NAME}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理"""
    from app.core.redis import close_redis
    await close_redis()
    print("[STOP] 咕噜 Gulu API 已关闭")


@app.get("/")
async def root():
    return {"message": "咕噜 Gulu API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

"""
FastAPI 应用入口。
- 配置 CORS（允许前端跨域访问）
- 注册路由
- 启动时自动建表（开发便利；生产建议改用 alembic 迁移）
运行：uvicorn app.main:app --reload --port 8000
接口文档：http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routers import auth, progress, questions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时：自动建表（若表已存在则跳过，不会覆盖数据）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 轻量迁移：为已存在的旧表补充后加的列（create_all 不会 ALTER 已有表）。
        # PostgreSQL 的 ADD COLUMN IF NOT EXISTS 幂等，重复启动安全。
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS slogan VARCHAR(100)")
        )
    yield
    # 关闭时：释放连接池
    await engine.dispose()


app = FastAPI(title="背了吗 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(progress.router, prefix="/api")


@app.get("/", tags=["health"])
async def root():
    # 根路径欢迎信息：避免访问 / 时 404，方便确认服务存活
    return {"service": "背了吗 API", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health", tags=["health"])
async def health():
    return {"ok": True}

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

from app.config import settings
from app.database import Base, engine
from app.routers import auth, progress, questions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时：自动建表（若表已存在则跳过，不会覆盖数据）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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


@app.get("/api/health", tags=["health"])
async def health():
    return {"ok": True}

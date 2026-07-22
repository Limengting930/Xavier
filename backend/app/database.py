"""
数据库连接（SQLAlchemy 异步）。
- engine：数据库引擎（连接池）
- AsyncSessionLocal：会话工厂，每个请求开一个会话
- get_db：FastAPI 依赖，接口里用 Depends(get_db) 拿到 db 会话，请求结束自动关闭
- Base：所有 ORM 模型的基类
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,          # True 会打印所有 SQL，调试时可开
    pool_pre_ping=True,  # 连接前先探活，避免云库空闲断连报错
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """所有数据表模型的基类"""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖：提供数据库会话，请求结束自动关闭。"""
    async with AsyncSessionLocal() as session:
        yield session

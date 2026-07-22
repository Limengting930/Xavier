"""
数据表定义（ORM 模型）。
用 SQLAlchemy 的类映射数据库表，一个类 = 一张表，一个属性 = 一列。
这些模型也可用 alembic 自动生成建表迁移；或直接用 docs 里的建表 SQL 手动建表。
"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    """题库（共享只读）。keywords/interview 存 JSON 字符串，前端 safeJson 解析。"""
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    cat: Mapped[str | None] = mapped_column(Text, nullable=True)
    q: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    a: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON 字符串
    pitfalls: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON 字符串
    diff: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int | None] = mapped_column(Integer, nullable=True)


class UserProgress(Base):
    """每用户一条学习进度（user_id 主键，天然隔离）。
    各 *_json 字段存 JSON 字符串（Text），与前端现有「JSON.parse 口径」完全一致，
    API 原样收发字符串，前端零改动。将来需按内容查询再迁移为 JSONB。"""
    __tablename__ = "user_progress"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    cards_json: Mapped[str] = mapped_column(Text, default="{}")
    daily_json: Mapped[str] = mapped_column(Text, default="{}")
    custom_json: Mapped[str] = mapped_column(Text, default="[]")
    documents_json: Mapped[str] = mapped_column(Text, default="[]")
    deleted_docs_json: Mapped[str] = mapped_column(Text, default="[]")
    achievements_json: Mapped[str] = mapped_column(Text, default="{}")
    mode: Mapped[str] = mapped_column(String(20), default="flashcard")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class OtpCode(Base):
    """短信验证码临时表（phone 主键，一个手机号同时只有一个有效码）。"""
    __tablename__ = "otp_codes"

    phone: Mapped[str] = mapped_column(String(20), primary_key=True)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

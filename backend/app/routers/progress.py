"""
学习进度路由（按当前登录用户隔离）：
- GET /progress  返回当前用户的进度（无则返回空默认值）
- PUT /progress  upsert 当前用户的进度（整块 JSON blob 覆盖写）

数据隔离核心：user_id 来自 JWT（get_current_user），SQL 只操作该用户自己那行，
前端无法越权访问他人数据。
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import User, UserProgress
from app.schemas import ProgressIn, ProgressOut

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressOut)
async def get_progress(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(UserProgress, current.id)
    if row is None:
        return ProgressOut()  # 新用户：返回空默认值
    return ProgressOut(
        cards_json=row.cards_json,
        daily_json=row.daily_json,
        custom_json=row.custom_json,
        documents_json=row.documents_json,
        deleted_docs_json=row.deleted_docs_json,
        achievements_json=row.achievements_json,
        mode=row.mode,
    )


@router.put("", response_model=ProgressOut)
async def put_progress(
    body: ProgressIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(UserProgress, current.id)
    if row is None:
        row = UserProgress(user_id=current.id)
        db.add(row)
    # 整块覆盖写
    row.cards_json = body.cards_json
    row.daily_json = body.daily_json
    row.custom_json = body.custom_json
    row.documents_json = body.documents_json
    row.deleted_docs_json = body.deleted_docs_json
    row.achievements_json = body.achievements_json
    row.mode = body.mode
    await db.commit()
    await db.refresh(row)
    return ProgressOut(
        cards_json=row.cards_json,
        daily_json=row.daily_json,
        custom_json=row.custom_json,
        documents_json=row.documents_json,
        deleted_docs_json=row.deleted_docs_json,
        achievements_json=row.achievements_json,
        mode=row.mode,
    )

"""
题库路由：GET /questions —— 返回全量题库（共享只读，需登录）。
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import Question, User
from app.schemas import QuestionOut

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=list[QuestionOut])
async def list_questions(
    _: User = Depends(get_current_user),   # 需登录
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).order_by(Question.sort_order.asc().nulls_last()))
    rows = result.scalars().all()
    return [
        QuestionOut(
            id=r.id, cat=r.cat, q=r.q, summary=r.summary, a=r.a,
            keywords=r.keywords, pitfalls=r.pitfalls, interview=r.interview, diff=r.diff,
        )
        for r in rows
    ]

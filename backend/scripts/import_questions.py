"""
题库导入脚本：把题库数据从 JSON 文件导入腾讯云 PostgreSQL。

用法：
  1. 准备 questions.json（数组，每项含 id/cat/q/summary/a/keywords/pitfalls/interview/diff/sort_order）
     —— 获取方式见 README「导入题库」章节。
  2. 激活虚拟环境后运行：python scripts/import_questions.py questions.json

注意：keywords/interview 若在源数据里已是数组，会被转成 JSON 字符串存库（与前端 safeJson 口径一致）。
"""
import asyncio
import json
import sys

from sqlalchemy import delete

from app.database import AsyncSessionLocal, Base, engine
from app.models import Question


def _to_json_str(v) -> str:
    """数组 → JSON 字符串；已是字符串则原样；None → '[]'"""
    if v is None:
        return "[]"
    if isinstance(v, str):
        return v
    return json.dumps(v, ensure_ascii=False)


async def main(path: str):
    with open(path, "r", encoding="utf-8") as f:
        rows = json.load(f)
    if not isinstance(rows, list):
        raise SystemExit("questions.json 必须是数组")

    # 建表（若不存在）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 清空重导（题库共享只读，全量覆盖最简单）
        await db.execute(delete(Question))
        for i, r in enumerate(rows):
            db.add(Question(
                id=r["id"],
                cat=r.get("cat"),
                q=r.get("q"),
                summary=r.get("summary"),
                a=r.get("a"),
                keywords=_to_json_str(r.get("keywords")),
                pitfalls=r.get("pitfalls"),
                interview=_to_json_str(r.get("interview")),
                diff=r.get("diff"),
                sort_order=r.get("sort_order", i),
            ))
        await db.commit()
    print(f"导入完成，共 {len(rows)} 条题目。")
    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("用法：python scripts/import_questions.py questions.json")
    asyncio.run(main(sys.argv[1]))

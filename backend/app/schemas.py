"""
请求 / 响应数据格式（Pydantic 模型）。
FastAPI 用它们校验入参、生成 /docs 文档、序列化返回值。
"""
from pydantic import BaseModel, Field


# ── 认证 ──
class SendOtpReq(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, description="11 位手机号")


class LoginReq(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11)
    code: str = Field(..., min_length=4, max_length=6)


class UserOut(BaseModel):
    id: int
    phone: str
    nickname: str | None = None
    avatar: str | None = None
    slogan: str | None = None


class UpdateProfileReq(BaseModel):
    """更新用户资料：三项均可选，仅传的字段被更新（None = 不改）。"""
    nickname: str | None = Field(default=None, max_length=20, description="昵称")
    avatar: str | None = Field(default=None, description="头像 URL 或 base64 dataURL")
    slogan: str | None = Field(default=None, max_length=50, description="个性签名")


class LoginResp(BaseModel):
    token: str
    user: UserOut


class OkResp(BaseModel):
    ok: bool = True


# ── 题库 ──
class QuestionOut(BaseModel):
    id: int
    cat: str | None = None
    q: str | None = None
    summary: str | None = None
    a: str | None = None
    keywords: str | None = None   # JSON 字符串，前端 safeJson 解析
    pitfalls: str | None = None
    interview: str | None = None  # JSON 字符串
    diff: int | None = None


# ── 学习进度（各字段为 JSON 字符串，与前端 JSON.parse 口径一致）──
class ProgressOut(BaseModel):
    cards_json: str = "{}"
    daily_json: str = "{}"
    custom_json: str = "[]"
    documents_json: str = "[]"
    deleted_docs_json: str = "[]"
    achievements_json: str = "{}"
    mode: str = "flashcard"


class ProgressIn(BaseModel):
    cards_json: str = "{}"
    daily_json: str = "{}"
    custom_json: str = "[]"
    documents_json: str = "[]"
    deleted_docs_json: str = "[]"
    achievements_json: str = "{}"
    mode: str = "flashcard"

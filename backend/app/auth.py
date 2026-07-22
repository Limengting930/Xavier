"""
JWT 签发与校验。
- create_token：登录成功后生成 token
- decode_token：校验 token，返回其中的 user_id
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings


def create_token(user_id: int) -> str:
    """签发 JWT，payload 含 user_id(sub) 和过期时间。"""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> int | None:
    """校验 token，成功返回 user_id，失败（无效/过期）返回 None。"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None

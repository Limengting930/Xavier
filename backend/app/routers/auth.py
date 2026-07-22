"""
认证路由：手机号 + 短信验证码（OTP）。
- POST /auth/send-otp  发送验证码
- POST /auth/login     验证码登录/注册，返回 JWT
- GET  /auth/me        拿当前登录用户信息
"""
import random
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_token
from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import OtpCode, User
from app.schemas import LoginReq, LoginResp, OkResp, SendOtpReq, UserOut
from app.sms import send_otp_sms

router = APIRouter(prefix="/auth", tags=["auth"])

PHONE_RE = re.compile(r"^1[3-9]\d{9}$")
OTP_TTL_MINUTES = 5        # 验证码有效期
RESEND_INTERVAL_SEC = 60   # 同一手机号重发间隔


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/send-otp", response_model=OkResp)
async def send_otp(body: SendOtpReq, db: AsyncSession = Depends(get_db)):
    phone = body.phone.strip()
    if not PHONE_RE.match(phone):
        raise HTTPException(status_code=400, detail="手机号格式不正确")

    # 限流：同一手机号 60 秒内只能发一次
    existing = await db.get(OtpCode, phone)
    if existing and (_now() - existing.created_at).total_seconds() < RESEND_INTERVAL_SEC:
        raise HTTPException(status_code=429, detail="验证码发送过于频繁，请稍后再试")

    # 生成验证码：开发模式固定 000000，生产随机 6 位
    code = "000000" if settings.DEV_FAKE_SMS else f"{random.randint(0, 999999):06d}"
    expires_at = _now() + timedelta(minutes=OTP_TTL_MINUTES)

    # upsert 到 otp_codes
    if existing:
        existing.code = code
        existing.expires_at = expires_at
        existing.created_at = _now()
    else:
        db.add(OtpCode(phone=phone, code=code, expires_at=expires_at, created_at=_now()))
    await db.commit()

    # 发短信（开发模式只打印，不真发）
    try:
        send_otp_sms(phone, code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"短信发送失败：{e}")

    return OkResp()


@router.post("/login", response_model=LoginResp)
async def login(body: LoginReq, db: AsyncSession = Depends(get_db)):
    phone = body.phone.strip()
    code = body.code.strip()

    # 校验验证码
    rec = await db.get(OtpCode, phone)
    if rec is None or rec.code != code:
        raise HTTPException(status_code=400, detail="验证码错误")
    # expires_at 从库里取出带时区，直接比较
    if rec.expires_at < _now():
        raise HTTPException(status_code=400, detail="验证码已过期，请重新获取")

    # 一次性使用：验证通过即删除
    await db.delete(rec)

    # 查用户：存在则登录，不存在则自动注册
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(phone=phone, nickname=f"用户{phone[-4:]}")
        db.add(user)
        await db.flush()  # 拿到自增 id

    await db.commit()
    await db.refresh(user)

    token = create_token(user.id)
    return LoginResp(
        token=token,
        user=UserOut(id=user.id, phone=user.phone, nickname=user.nickname, avatar=user.avatar),
    )


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)):
    return UserOut(id=current.id, phone=current.phone, nickname=current.nickname, avatar=current.avatar)

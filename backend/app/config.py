"""
应用配置：从 .env 读取环境变量。
用 pydantic-settings，读到的值有类型校验，缺关键项会在启动时报错（比运行时崩好）。
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # 数据库
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # 腾讯云短信
    TENCENT_SECRET_ID: str = ""
    TENCENT_SECRET_KEY: str = ""
    SMS_SDK_APP_ID: str = ""
    SMS_SIGN_NAME: str = ""
    SMS_TEMPLATE_ID: str = ""
    SMS_REGION: str = "ap-guangzhou"

    # 开发模式：true 时不真发短信，验证码固定 000000
    DEV_FAKE_SMS: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()  # 全局单例，其他模块 from app.config import settings

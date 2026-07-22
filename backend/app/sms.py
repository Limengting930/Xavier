"""
腾讯云短信封装。
- 开发模式（DEV_FAKE_SMS=true）：不真发短信，直接打印验证码到控制台，方便本地开发。
- 生产模式：调腾讯云短信 SDK 真发。需先在腾讯云开通短信、审核通过签名和模板。
"""
from app.config import settings


def send_otp_sms(phone: str, code: str) -> None:
    """给 phone 发送验证码 code。失败抛异常由上层处理。"""
    if settings.DEV_FAKE_SMS:
        # 开发模式：不真发，打印到后端控制台
        print(f"[DEV_FAKE_SMS] 向 {phone} 发送验证码：{code}")
        return

    # 生产模式：腾讯云短信 SDK
    from tencentcloud.common import credential
    from tencentcloud.sms.v20210111 import models, sms_client

    cred = credential.Credential(settings.TENCENT_SECRET_ID, settings.TENCENT_SECRET_KEY)
    client = sms_client.SmsClient(cred, settings.SMS_REGION)

    req = models.SendSmsRequest()
    req.SmsSdkAppId = settings.SMS_SDK_APP_ID
    req.SignName = settings.SMS_SIGN_NAME
    req.TemplateId = settings.SMS_TEMPLATE_ID
    req.PhoneNumberSet = [f"+86{phone}"]        # 国内号码加 +86
    req.TemplateParamSet = [code]                # 对应模板里的 {1}

    resp = client.SendSms(req)
    # 检查发送结果
    status = resp.SendStatusSet[0] if resp.SendStatusSet else None
    if status is None or status.Code != "Ok":
        raise RuntimeError(f"短信发送失败：{getattr(status, 'Message', '未知错误')}")

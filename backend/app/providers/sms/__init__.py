from app.config import get_settings
from app.providers.sms.base import SMSProvider

def get_sms_provider() -> SMSProvider:
    settings = get_settings()
    if settings.SMS_PROVIDER == "msg91":
        from app.providers.sms.msg91 import MSG91Provider
        return MSG91Provider()
    
    # fallback: console (dev)
    from app.providers.sms.console import ConsoleSMSProvider
    return ConsoleSMSProvider()

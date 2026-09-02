import httpx
from app.providers.sms.base import SMSProvider
from app.config import get_settings

class MSG91Provider(SMSProvider):
    def __init__(self):
        self.settings = get_settings()

    async def send_otp(self, phone: str, otp: str) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.msg91.com/api/v5/otp",
                    params={
                        "authkey": self.settings.MSG91_AUTH_KEY,
                        "template_id": self.settings.MSG91_OTP_TEMPLATE_ID,
                        "mobile": phone,
                        "otp": otp,
                    },
                    timeout=10.0,
                )
                return response.status_code == 200
            except Exception as e:
                # Log exception in a real setup
                return False

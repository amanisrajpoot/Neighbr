import logging
from app.providers.sms.base import SMSProvider

logger = logging.getLogger(__name__)

class ConsoleSMSProvider(SMSProvider):
    async def send_otp(self, phone: str, otp: str) -> bool:
        # In a real scenario, this wouldn't log to production logs, but just for local dev
        logger.info(f"========== MOCK SMS ==========")
        logger.info(f"To: {phone}")
        logger.info(f"OTP: {otp}")
        logger.info(f"==============================")
        print(f"\n========== MOCK SMS ==========\nTo: {phone}\nOTP: {otp}\n==============================\n")
        return True

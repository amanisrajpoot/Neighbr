from abc import ABC, abstractmethod

class SMSProvider(ABC):
    @abstractmethod
    async def send_otp(self, phone: str, otp: str) -> bool:
        pass

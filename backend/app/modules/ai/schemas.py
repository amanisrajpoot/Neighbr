from pydantic import BaseModel
from typing import Any

class AIChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class AIChatRequest(BaseModel):
    message: str
    history: list[AIChatMessage] = []

class AIChatResponse(BaseModel):
    reply: str
    suggested_actions: list[str] = []

class AIDraftNoticeRequest(BaseModel):
    topic: str
    bullet_points: list[str]
    tone: str = "formal"  # formal, urgent, celebratory, advisory

class AIDraftNoticeResponse(BaseModel):
    title: str
    body: str
    category: str
    priority: str

class AISecurityAnomaly(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # low, medium, high, critical
    occurred_at: str
    recommended_action: str

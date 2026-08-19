import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.societies.models import Society
from app.modules.ai.schemas import (
    AIChatRequest,
    AIChatResponse,
    AIDraftNoticeRequest,
    AIDraftNoticeResponse,
    AISecurityAnomaly,
)

class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def handle_resident_chat(
        self, society_id: uuid.UUID, user: User, payload: AIChatRequest
    ) -> AIChatResponse:
        query_lower = payload.message.lower()

        # Context-aware intelligent responses
        if "tennis" in query_lower or "court" in query_lower or "pool" in query_lower or "amenit" in query_lower:
            return AIChatResponse(
                reply=(
                    "You can reserve society facilities directly from the 'Clubhouse' tab in your Neighbr app! "
                    "The Olympic Pool is open from 6:00 AM to 9:00 PM, and Lawn Tennis courts are floodlit until 10:00 PM. "
                    "Bookings generate an instant QR access pass for gate entry."
                ),
                suggested_actions=["Open Clubhouse Amenities", "View My Bookings"],
            )
        elif "due" in query_lower or "bill" in query_lower or "maintenance" in query_lower or "pay" in query_lower:
            return AIChatResponse(
                reply=(
                    "Maintenance bills are generated on the 1st of every month and are due by the 25th. "
                    "You can view your itemized charge breakdown (Base maintenance, Sinking fund, Water utility, and GST) "
                    "and pay via 1-tap UPI or Credit Card from the 'Maintenance' screen to instantly get your verified digital receipt."
                ),
                suggested_actions=["Pay Maintenance Now", "View Payment Receipts"],
            )
        elif "maid" in query_lower or "cook" in query_lower or "staff" in query_lower or "driver" in query_lower:
            return AIChatResponse(
                reply=(
                    "To link domestic help to your flat, navigate to the 'Domestic Help' section in your resident app. "
                    "You can browse the society's verified daily staff directory, view live in/out gate status, and add them with 1 tap."
                ),
                suggested_actions=["Browse Staff Directory", "View Unit Staff Status"],
            )
        elif "helpdesk" in query_lower or "leak" in query_lower or "plumb" in query_lower or "electric" in query_lower or "repair" in query_lower:
            return AIChatResponse(
                reply=(
                    "For any repairs or complaints, tap 'Helpdesk' on your home screen. "
                    "Select your issue category (Plumbing, Electrical, Lift, Security), choose priority, and a technician will be automatically assigned within our society SLA deadline."
                ),
                suggested_actions=["Create Helpdesk Ticket", "Track Active Tickets"],
            )
        else:
            return AIChatResponse(
                reply=(
                    f"Hello {user.full_name}! I am your Neighbr AI Resident Assistant. "
                    "I can help you check maintenance dues, book clubhouse slots, report service tickets, find verified local vendors, or look up society rules. "
                    "How may I assist you today?"
                ),
                suggested_actions=["Book Clubhouse Slot", "Pay Maintenance Dues", "Report Maintenance Issue"],
            )

    async def draft_notice(
        self, society_id: uuid.UUID, payload: AIDraftNoticeRequest
    ) -> AIDraftNoticeResponse:
        topic_lower = payload.topic.lower()
        points_formatted = "\n".join(f"• {pt}" for pt in payload.bullet_points)

        title = f"Notice: {payload.topic.strip().title()}"
        category = "general"
        priority = "normal"

        if "water" in topic_lower or "power" in topic_lower or "shutdown" in topic_lower:
            category = "maintenance"
            priority = "urgent"
            body = (
                f"Dear Residents,\n\n"
                f"Please be advised regarding the upcoming maintenance work for {payload.topic.strip()}:\n\n"
                f"{points_formatted}\n\n"
                f"We kindly request all flat owners and tenants to make necessary arrangements in advance. "
                f"Our estate maintenance team will strive to minimize inconvenience.\n\n"
                f"Regards,\nManagement Committee"
            )
        elif "festival" in topic_lower or "celebration" in topic_lower or "event" in topic_lower:
            category = "events"
            priority = "normal"
            body = (
                f"Dear Neighbors,\n\n"
                f"We are delighted to announce {payload.topic.strip()}:\n\n"
                f"{points_formatted}\n\n"
                f"All residents and their families are warmly invited to join and celebrate together.\n\n"
                f"Warm Regards,\nCultural & Events Committee"
            )
        else:
            body = (
                f"Dear Residents,\n\n"
                f"This is an official communication regarding {payload.topic.strip()}:\n\n"
                f"{points_formatted}\n\n"
                f"Thank you for your cooperation in keeping our community safe, clean, and harmonious.\n\n"
                f"Sincerely,\nEstate Administration"
            )

        return AIDraftNoticeResponse(
            title=title,
            body=body,
            category=category,
            priority=priority,
        )

    async def get_security_anomalies(
        self, society_id: uuid.UUID
    ) -> list[AISecurityAnomaly]:
        return [
            AISecurityAnomaly(
                id="anom-1",
                title="Unusual After-Hours Delivery Inflow",
                description="3 unannounced e-commerce delivery personnel arrived at South Gate between 01:15 AM and 02:30 AM without pre-generated resident passes.",
                severity="medium",
                occurred_at="Last Night, 01:45 AM",
                recommended_action="Reinforce night-shift guard protocol to require instant resident OTP confirmation before barrier open.",
            ),
            AISecurityAnomaly(
                id="anom-2",
                title="Overstayed Contractor In Tower B",
                description="Daily renovation contractor checked in at 09:00 AM for Flat B-402 and has not recorded an exit pass after 19:00 PM cutoff.",
                severity="high",
                occurred_at="Today, 07:15 PM",
                recommended_action="Dispatch patrolling guard to verify flat status and ensure contractor egress.",
            ),
            AISecurityAnomaly(
                id="anom-3",
                title="Repeated ANPR Unregistered Vehicle Attempts",
                description="Black Sedan (DL 04 AB 9812) scanned 4 times at Main Inflow Gate within 30 minutes without active resident FastTag.",
                severity="low",
                occurred_at="Today, 04:30 PM",
                recommended_action="Instruct gate sentry to register vehicle in visitor log or allocate guest parking bay.",
            ),
        ]

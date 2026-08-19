"""
Scenario 5: Clubhouse Amenity Booking & Concurrency Conflict Testing
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any

def run_scenario_amenities(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    unit_id = context["unit_id"]
    amenity_id = context["amenity_id"]

    # Slot for tomorrow 18:00 to 19:00
    tomorrow_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")

    # 1. Resident A: Book Tennis Court Slot
    booking_payload = {
        "booking_date": tomorrow_date,
        "start_time": "18:00",
        "end_time": "19:00",
        "guest_count": 2,
        "unit_id": unit_id
    }
    booking_res = client.http_request(
        name="Resident: Book Clubhouse Tennis Court 6PM Slot",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/amenities/{amenity_id}/book",
        payload=booking_payload,
        expected_status=201
    )
    booking_id = booking_res["id"]
    context["booking_id"] = booking_id

    # 2. Concurrency Conflict Test: Resident attempts to book overlapping slot exceeding capacity
    conflict_payload = {
        "booking_date": tomorrow_date,
        "start_time": "18:00",
        "end_time": "19:00",
        "guest_count": 10, # Exceeds capacity of 4
        "unit_id": unit_id
    }
    client.http_request(
        name="Concurrency Guard: Verify Capacity Exceeded Conflict Rejection",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/amenities/{amenity_id}/book",
        payload=conflict_payload,
        expected_status=400
    )

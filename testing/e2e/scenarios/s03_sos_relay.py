"""
Scenario 3: Real-Time Emergency SOS & Society Broadcast Relay
"""

import asyncio
from typing import Dict, Any

def run_scenario_sos_relay(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    unit_id = context["unit_id"]

    # 1. Resident: Trigger Medical SOS Alarm via HTTP
    sos_payload = {
        "unit_id": unit_id,
        "sos_type": "medical",
        "message": "Elderly resident medical assistance needed immediately at Villa-42",
        "location": {"building": "Tower A", "unit": "Villa-42", "floor": "Ground"}
    }
    sos_res = client.http_request(
        name="Resident: Trigger Urgent Medical SOS Alarm",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/sos",
        payload=sos_payload,
        expected_status=201
    )
    sos_id = sos_res["id"]
    assert sos_res["status"] == "active"

    # 2. Society Admin: Resolve SOS Event after Security Response
    resolve_payload = {
        "status": "resolved",
        "resolution_notes": "First-aid medical team dispatched and resident assisted safely."
    }
    client.http_request(
        name="Society Admin: Resolve SOS Incident with Audit Log",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/sos/{sos_id}/resolve",
        payload=resolve_payload,
        expected_status=200
    )

    # 3. Society Admin: AI Copilot Emergency Broadcast
    notice_payload = {
        "title": "🚨 EMERGENCY NOTICE: Severe Rain Advisory",
        "body": "Heavy monsoon rains forecasted. Residents advised to park vehicles on Upper Level.",
        "category": "emergency",
        "priority": "urgent",
        "send_push": True
    }
    client.http_request(
        name="Society Admin: Broadcast AI-Assisted Society Alert",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/notices",
        payload=notice_payload,
        expected_status=201
    )

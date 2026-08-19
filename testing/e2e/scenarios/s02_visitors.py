"""
Scenario 2: Visitor Gatekeeping & Life-Cycle State Machine
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

def run_scenario_visitors(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    unit_id = context["unit_id"]
    gate_id = context["gate_id"]

    now = datetime.now(timezone.utc)
    valid_from = now.isoformat()
    valid_until = (now + timedelta(hours=6)).isoformat()

    # 1. Resident: Create pre-approved visitor pass
    pass_payload = {
        "unit_id": unit_id,
        "visitor_name": "Rohan Deshmukh",
        "visitor_phone": "+919876599901",
        "pass_type": "guest",
        "valid_from": valid_from,
        "valid_until": valid_until,
        "vehicle_number": "KA-01-MJ-8899",
        "purpose": "Weekend Family Dinner"
    }
    v_pass = client.http_request(
        name="Resident: Issue Pre-Approved QR Guest Pass",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/visitors/passes",
        payload=pass_payload,
        expected_status=201
    )
    qr_token = v_pass["qr_token"]
    pass_id = v_pass["id"]
    context["pass_id"] = pass_id

    # 2. Gate Guard: Scan QR Token at North Gate Terminal
    scan_payload = {
        "qr_token": qr_token,
        "gate_id": gate_id,
        "guard_notes": "Verified photo ID at gate checkpoint"
    }
    scan_res = client.http_request(
        name="Gate Guard: Scan & Verify Visitor Pass at Terminal",
        role="Gate Guard",
        method="POST",
        endpoint=f"/societies/{society_id}/gates/{gate_id}/scan",
        payload=scan_payload,
        expected_status=200
    )
    assert scan_res["status"] in ("APPROVED", "CREATED", "ACTIVE", "CHECKED_IN")

    # 3. Gate Guard: Check-In Visitor Entry
    entry_payload = {
        "pass_id": pass_id,
        "idempotency_key": str(uuid.uuid4()),
        "visitor_photo_url": "https://minio.local/media/visitor-99901.jpg"
    }
    entry_event = client.http_request(
        name="Gate Guard: Record Checked-In Entry Egress",
        role="Gate Guard",
        method="POST",
        endpoint=f"/societies/{society_id}/gates/{gate_id}/check-in",
        payload=entry_payload,
        expected_status=200
    )
    event_id = entry_event["id"]

    # 4. Gate Guard: Record Exit Check-Out
    out_payload = {
        "pass_id": pass_id,
        "event_id": event_id,
        "idempotency_key": str(uuid.uuid4())
    }
    exit_event = client.http_request(
        name="Gate Guard: Check-Out Visitor at Gate",
        role="Gate Guard",
        method="POST",
        endpoint=f"/societies/{society_id}/gates/{gate_id}/check-out",
        payload=out_payload,
        expected_status=200
    )
    assert exit_event["event_type"] == "CHECKED_OUT"

    # 5. Security Supervisor: Add Suspicious Entity to Security Blacklist
    blk_payload = {
        "entity_type": "vehicle",
        "entity_value": "DL-01-STOLEN-99",
        "reason": "Vehicle flagged by law enforcement for suspicious perimeter reconnaissance",
        "is_active": True
    }
    client.http_request(
        name="Security Supervisor: Add Vehicle to Estate Blacklist",
        role="Security Supervisor",
        method="POST",
        endpoint=f"/societies/{society_id}/visitors/blacklist",
        payload=blk_payload,
        expected_status=201
    )

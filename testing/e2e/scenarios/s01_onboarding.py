"""
Scenario 1: Society Onboarding & Infrastructure Provisioning
"""

import uuid
from typing import Dict, Any

def run_scenario_onboarding(client) -> Dict[str, Any]:
    context = {}

    # 1. Super Admin: Create society tenant
    soc_slug = f"palms-{uuid.uuid4().hex[:6]}"
    soc_payload = {
        "name": "Greenwood Palms Heights",
        "slug": soc_slug,
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560066",
        "address": "42 Varthur Road, Whitefield",
        "settings": {"auto_approve_delivery": True, "strict_gate_mode": True}
    }
    soc = client.http_request(
        name="Super Admin: Onboard New Gated Community",
        role="Super Admin",
        method="POST",
        endpoint="/societies",
        payload=soc_payload,
        expected_status=201
    )
    society_id = soc["id"]
    context["society_id"] = society_id

    # 2. Society Admin: Provision Building
    bldg_payload = {
        "name": "Tower A",
        "code": "TOW-A",
        "total_floors": 12
    }
    bldg = client.http_request(
        name="Society Admin: Create Tower A Building Structure",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/buildings",
        payload=bldg_payload,
        expected_status=201
    )
    bldg_id = bldg["id"]

    # 3. Society Admin: Provision Floor
    floor_payload = {
        "name": "Ground Floor",
        "floor_number": 0
    }
    floor = client.http_request(
        name="Society Admin: Create Ground Floor Level",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/buildings/{bldg_id}/floors",
        payload=floor_payload,
        expected_status=201
    )
    floor_id = floor["id"]

    # 4. Society Admin: Provision Unit Inventory
    unit_payload = {
        "building_id": bldg_id,
        "floor_id": floor_id,
        "unit_number": "Villa-42",
        "unit_type": "villa"
    }
    unit = client.http_request(
        name="Society Admin: Create Villa-42 Unit Inventory",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/units",
        payload=unit_payload,
        expected_status=201
    )
    context["unit_id"] = unit["id"]

    # 3. Society Admin: Configure Gates
    gate_payload = {
        "name": "Main North Gate",
        "gate_code": "GATE-01",
        "gate_type": "both",
        "terminal_device_id": "GATE-TERM-01",
        "is_active": True
    }
    gate = client.http_request(
        name="Society Admin: Provision Main North Gate Terminal",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/gates",
        payload=gate_payload,
        expected_status=201
    )
    context["gate_id"] = gate["id"]

    # 6. Society Admin: Provision Amenities
    amenity_payload = {
        "name": "Clubhouse Tennis Court",
        "code": "AMN-TENNIS-01",
        "category": "sports",
        "description": "Synthetic floodlit court with international turf",
        "capacity_per_slot": 4,
        "slot_duration_minutes": 60,
        "open_time": "06:00",
        "close_time": "22:00",
        "is_paid": False
    }
    amenity = client.http_request(
        name="Society Admin: Provision Clubhouse Tennis Court",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/amenities",
        payload=amenity_payload,
        expected_status=201
    )
    context["amenity_id"] = amenity["id"]

    return context

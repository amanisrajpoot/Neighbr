"""
Scenario 4: Guard Terminal Offline-First SQLite Synchronization
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any

def run_scenario_offline_sync(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    gate_id = context["gate_id"]
    unit_id = context["unit_id"]

    # 1. Guard Terminal: Simulate 2 Offline Gate Mutations queued during network dropout
    offline_mutation_1 = {
        "operation_id": str(uuid.uuid4()),
        "operation_type": "walk_in",
        "entity_type": "visitor",
        "idempotency_key": str(uuid.uuid4()),
        "local_created_at": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "visitor_name": "Zomato Delivery Executive",
            "visitor_phone": "+919876544401",
            "unit_id": str(unit_id)
        }
    }

    offline_mutation_2 = {
        "operation_id": str(uuid.uuid4()),
        "operation_type": "walk_in",
        "entity_type": "visitor",
        "idempotency_key": str(uuid.uuid4()),
        "local_created_at": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "visitor_name": "Uber Driver (KA03HA1290)",
            "visitor_phone": "+919876544402",
            "unit_id": str(unit_id)
        }
    }

    sync_push_payload = {
        "society_id": str(society_id),
        "device_id": "GATE-TERM-01",
        "gate_id": str(gate_id),
        "operations": [offline_mutation_1, offline_mutation_2]
    }

    # 2. Guard Reconnects: Post offline mutations to /sync/batch
    sync_res = client.http_request(
        name="Gate Guard: Reconcile Offline SQLite Mutations via /sync/batch",
        role="Gate Guard",
        method="POST",
        endpoint="/sync/batch",
        payload=sync_push_payload,
        expected_status=200
    )
    assert sync_res["synced_count"] >= 2

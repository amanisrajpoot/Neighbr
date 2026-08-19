"""
Scenario 9: IoT Hardware Control & Barrier Pulse
"""

from typing import Dict, Any

def run_scenario_iot_hardware(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    gate_id = context["gate_id"]

    # 1. Security Supervisor: Register Boom Barrier IoT Device
    device_payload = {
        "gate_id": gate_id,
        "name": "Main North Gate Boom Barrier Controller",
        "device_type": "BOOM_BARRIER",
        "ip_address": "192.168.1.201",
        "mac_address": "00:1A:2B:3C:4D:5E",
        "firmware_version": "v2.4.1"
    }
    device = client.http_request(
        name="Security Supervisor: Register Gate Boom Barrier IoT Hardware",
        role="Security Supervisor",
        method="POST",
        endpoint=f"/societies/{society_id}/iot/devices",
        payload=device_payload,
        expected_status=201
    )
    device_id = device["id"]

    # 2. Security Supervisor: Send Pulse Command to Open Barrier
    cmd_payload = {
        "command": "OPEN_BARRIER",
        "triggered_by": "SECURITY_SUPERVISOR_CONSOLE"
    }
    cmd_res = client.http_request(
        name="Security Supervisor: Dispatch Remote Barrier Pulse Command",
        role="Security Supervisor",
        method="POST",
        endpoint=f"/societies/{society_id}/iot/devices/{device_id}/command",
        payload=cmd_payload,
        expected_status=200
    )
    assert cmd_res["status"] in ("EXECUTED", "SUCCESS", "QUEUED")

    # 3. Security Supervisor: Query Security Telemetry Stream
    audit_logs = client.http_request(
        name="Security Supervisor: Audit Security Hardware & Egress Logs",
        role="Security Supervisor",
        method="GET",
        endpoint=f"/societies/{society_id}/audit/events",
        expected_status=200
    )
    assert isinstance(audit_logs, list)

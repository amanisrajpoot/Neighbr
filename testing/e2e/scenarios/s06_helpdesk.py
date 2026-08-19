"""
Scenario 6: Helpdesk SLA Lifecycle & Technician Escalation
"""

from typing import Dict, Any

def run_scenario_helpdesk(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    unit_id = context["unit_id"]

    # 1. Resident: Create High-Priority Maintenance Ticket
    ticket_payload = {
        "unit_id": unit_id,
        "category": "lift",
        "priority": "high",
        "title": "Tower A Passenger Lift jerky stops on 4th floor",
        "description": "Passenger lift vibrates severely and makes metallic screeching noise between 3rd and 4th floors.",
        "images": ["https://minio.local/media/lift-issue-01.jpg"]
    }
    ticket = client.http_request(
        name="Resident: Raise High-Priority Lift Maintenance Ticket",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/helpdesk/tickets",
        payload=ticket_payload,
        expected_status=201
    )
    ticket_id = ticket["id"]
    context["ticket_id"] = ticket_id
    assert ticket["status"].lower() == "open"

    # 2. Society Admin: Update Ticket Status to In Progress
    status_payload = {
        "status": "in_progress",
        "resolution_notes": "Otis Elevator technician on-site inspecting traction motor cables."
    }
    client.http_request(
        name="Society Admin: Transition Ticket to IN_PROGRESS",
        role="Society Admin",
        method="PATCH",
        endpoint=f"/societies/{society_id}/helpdesk/tickets/{ticket_id}/status",
        payload=status_payload,
        expected_status=200
    )

    # 3. Technician: Add internal maintenance comment
    comment_payload = {
        "message": "Replaced guide shoe bearings on car frame. Test run completed with 100% smooth leveling.",
        "is_internal": False
    }
    client.http_request(
        name="Technician: Post Public Maintenance Resolution Update",
        role="Society Admin",
        method="POST",
        endpoint=f"/societies/{society_id}/helpdesk/tickets/{ticket_id}/comments",
        payload=comment_payload,
        expected_status=201
    )

    # 4. Society Admin: Mark Ticket Resolved
    res_payload = {
        "status": "resolved",
        "resolution_notes": "Repairs verified and elevator restored to full service."
    }
    client.http_request(
        name="Society Admin: Mark Ticket RESOLVED",
        role="Society Admin",
        method="PATCH",
        endpoint=f"/societies/{society_id}/helpdesk/tickets/{ticket_id}/status",
        payload=res_payload,
        expected_status=200
    )

    # 5. Resident: Submit 5-Star Feedback & Rating
    rating_payload = {
        "rating": 5,
        "feedback": "Prompt and professional technician service. Elevator running silently now!"
    }
    client.http_request(
        name="Resident: Submit 5-Star Feedback & Rating",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/helpdesk/tickets/{ticket_id}/rate",
        payload=rating_payload,
        expected_status=200
    )

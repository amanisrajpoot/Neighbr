"""
Scenario 7: Community Forum, Polls & Marketplace
"""

from typing import Dict, Any

def run_scenario_community(client, context: Dict[str, Any]):
    society_id = context["society_id"]

    # 1. Resident: Create Discussion Thread
    post_payload = {
        "title": "Weekend Estate Tree Plantation & Greenery Drive",
        "content": "Let's assemble this Saturday 8 AM at Central Park to plant 50 native saplings!",
        "category": "events"
    }
    post = client.http_request(
        name="Resident: Create Community Discussion Thread",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/community/posts",
        payload=post_payload,
        expected_status=201
    )
    post_id = post["id"]

    # 2. Resident: Like post
    client.http_request(
        name="Resident: Upvote Community Discussion",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/community/posts/{post_id}/like",
        expected_status=200
    )

    # 3. Committee Member: Create Society Decision Poll
    poll_payload = {
        "question": "Should the society install rooftop solar panels for common area electricity?",
        "options": [
            "Yes, approve immediately",
            "Need detailed cost-benefit presentation",
            "No, postpone to next AGM"
        ]
    }
    poll = client.http_request(
        name="Committee Member: Create Rooftop Solar Decision Poll",
        role="Management Committee",
        method="POST",
        endpoint=f"/societies/{society_id}/community/polls",
        payload=poll_payload,
        expected_status=201
    )
    poll_id = poll["id"]

    # 4. Resident: Cast Vote on Poll
    vote_payload = {
        "option_index": 0
    }
    client.http_request(
        name="Resident: Cast Vote on Solar Decision Poll",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/community/polls/{poll_id}/vote",
        payload=vote_payload,
        expected_status=200
    )

    # 5. Resident: Post Classified Listing on Marketplace
    item_payload = {
        "title": "Trek Marlin 7 Mountain Bike (Like New)",
        "description": "29-inch hydraulic disc brake mountain bike. Serviced regularly, excellent condition.",
        "price": 28000.0,
        "category": "sports",
        "images": ["https://minio.local/media/bike-01.jpg"]
    }
    client.http_request(
        name="Resident: Post Classified Listing on Marketplace",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/marketplace/listings",
        payload=item_payload,
        expected_status=201
    )

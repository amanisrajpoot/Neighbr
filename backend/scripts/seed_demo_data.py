import asyncio
import os
import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import select, delete
from app.database import engine, AsyncSessionLocal
from app.modules.societies.models import Society
from app.modules.amenities.models import Amenity

amenities_data = [
    {
        "name": "Olympic Swimming Pool",
        "code": "POOL",
        "category": "wellness",
        "description": "50-meter temperature controlled pool with dedicated kids splash area.",
        "capacity_per_slot": 12,
        "slot_duration_minutes": 60,
        "open_time": "06:00",
        "close_time": "21:00",
        "rules": ["Nylon swimming costume mandatory", "Shower before entering pool"],
        "is_paid": False,
        "price_per_slot": 0,
        "image_url": "https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Lawn Tennis Court",
        "code": "TENNIS",
        "category": "sports",
        "description": "Floodlit championship synthetic hard court.",
        "capacity_per_slot": 4,
        "slot_duration_minutes": 60,
        "open_time": "06:00",
        "close_time": "22:00",
        "rules": ["Non-marking shoes required", "Max 4 players per court"],
        "is_paid": False,
        "price_per_slot": 0,
        "image_url": "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Clubhouse Banquet",
        "code": "BANQUET",
        "category": "events",
        "description": "Air-conditioned banquet hall with attached catering pantry.",
        "capacity_per_slot": 100,
        "slot_duration_minutes": 240,
        "open_time": "10:00",
        "close_time": "23:00",
        "rules": ["Music limits after 10 PM", "Cleaning fee applicable"],
        "is_paid": True,
        "price_per_slot": 2500,
        "image_url": "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80",
    }
]

async def seed():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Society))
        societies = result.scalars().all()
        if not societies:
            return

        for society in societies:
            soc_id = society.id
            print(f"Seeding data for Society: {society.name} ({soc_id})")

            # Clean old E2E dummy data
            await session.execute(delete(Amenity).where(Amenity.society_id == soc_id))
            for ad in amenities_data:
                session.add(Amenity(society_id=soc_id, **ad))
            
        await session.commit()
        print("All societies successfully seeded with amenities.")

if __name__ == "__main__":
    asyncio.run(seed())

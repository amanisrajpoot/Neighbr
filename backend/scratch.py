import sys
import os
import asyncio
from sqlalchemy import select, update

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.modules.auth.models import User

async def run():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.phone == '+919876500001'))
        u = res.scalar_one_or_none()
        if u:
            print("Found user. Setting is_platform_admin to True and full_name to 'Aman Sharma'.")
            u.is_platform_admin = True
            u.full_name = "Aman Sharma"
            await session.commit()
            print("User updated.")
        else:
            print("Not found")

asyncio.run(run())

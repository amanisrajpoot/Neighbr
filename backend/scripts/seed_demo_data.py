import asyncio
import os
import sys
import uuid
import secrets
from datetime import datetime, timezone, date, timedelta
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.modules.auth.models import User, Role
from app.modules.societies.models import Society, SocietySettings, Building, Floor, Unit, UnitMembership, FamilyMember, ResidentProfile
from app.modules.staff.models import StaffProfile, StaffAssignment, StaffAttendance
from app.modules.vehicles.models import VehicleProfile
from app.modules.amenities.models import Amenity, AmenityBooking
from app.modules.billing.models import Invoice, PaymentTransaction
from app.modules.notices.models import Notice, EmergencyContact
from app.modules.helpdesk.models import HelpdeskTicket, TicketComment
from app.modules.marketplace.models import MarketplaceListing, VendorService
from app.modules.community.models import CommunityPost, PostComment, CommunityPoll
from app.modules.visitors.models import VisitorPass

async def seed_master_database():
    async with AsyncSessionLocal() as session:
        print("🌱 Starting master database seed across all modules...")

        # 1. Ensure Roles exist
        roles = {}
        for role_code in ["super_admin", "society_admin", "resident", "guard", "committee_member"]:
            res = await session.execute(select(Role).where(Role.code == role_code))
            role = res.scalar_one_or_none()
            if not role:
                role = Role(code=role_code, display_name=role_code.replace('_', ' ').title(), description=f"{role_code.replace('_', ' ').title()} role")
                session.add(role)
                await session.flush()
            roles[role_code] = role

        # 2. Ensure Primary Test Users exist
        # Siddharth Verma (Resident)
        res = await session.execute(select(User).where(User.phone == "+919876530002"))
        resident_user = res.scalar_one_or_none()
        if not resident_user:
            resident_user = User(
                id=uuid.UUID("35f84c33-268a-4073-b52e-f0b780785d7b"),
                phone="+919876530002",
                full_name="Siddharth Verma",
                email="siddharth.verma@example.com",
                phone_verified=True,
                avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
            )
            session.add(resident_user)
            await session.flush()

        # Aman Sharma (Admin)
        res = await session.execute(select(User).where(User.phone == "+919876500001"))
        admin_user = res.scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                id=uuid.UUID("30e45526-8dcb-410c-8612-d44bd6cfe66d"),
                phone="+919876500001",
                full_name="Aman Sharma",
                email="aman.sharma@example.com",
                phone_verified=True,
                is_platform_admin=True,
            )
            session.add(admin_user)
            await session.flush()

        # Jagdish R. (Guard)
        res = await session.execute(select(User).where(User.phone == "+919876530003"))
        guard_user = res.scalar_one_or_none()
        if not guard_user:
            guard_user = User(
                id=uuid.UUID("e97e82e4-ab50-4a91-b55d-53f748dd3a78"),
                phone="+919876530003",
                full_name="Jagdish R. (Guard)",
                email="guard.main@example.com",
                phone_verified=True,
            )
            session.add(guard_user)
            await session.flush()

        # 3. Ensure Primary Society exists
        res = await session.execute(select(Society))
        societies = res.scalars().all()
        
        # We ensure standard society ID: 34090e70-34f9-4cdd-9522-e2098982a5ed
        soc_id = uuid.UUID("34090e70-34f9-4cdd-9522-e2098982a5ed")
        res = await session.execute(select(Society).where(Society.id == soc_id))
        society = res.scalar_one_or_none()
        if not society:
            society = Society(
                id=soc_id,
                name="Greenwood Palms Heights",
                slug="greenwood-palms-heights",
                address_line1="Outer Ring Road, Bellandur",
                address_line2="Near EcoSpace Tech Park",
                city="Bengaluru",
                state="Karnataka",
                pincode="560103",
                country="IN",
                total_units=120,
                is_active=True,
            )
            session.add(society)
            await session.flush()

        print(f"🏢 Populating Society: {society.name} ({society.id})")

        # 4. Buildings, Floors & Units
        res = await session.execute(select(Building).where(Building.society_id == society.id, Building.name == "Villa Block"))
        villa_building = res.scalar_one_or_none()
        if not villa_building:
            villa_building = Building(society_id=society.id, name="Villa Block", code="VB", total_floors=2, total_units=20)
            session.add(villa_building)
            await session.flush()

        res = await session.execute(select(Building).where(Building.society_id == society.id, Building.name == "Tower A"))
        tower_a = res.scalar_one_or_none()
        if not tower_a:
            tower_a = Building(society_id=society.id, name="Tower A", code="TA", total_floors=14, total_units=56)
            session.add(tower_a)
            await session.flush()

        # Floor 1 in Villa Block
        res = await session.execute(select(Floor).where(Floor.building_id == villa_building.id))
        floor_vb = res.scalar_one_or_none()
        if not floor_vb:
            floor_vb = Floor(society_id=society.id, building_id=villa_building.id, name="Ground Floor", floor_number=0)
            session.add(floor_vb)
            await session.flush()

        # Primary Resident Unit: Villa-42
        res = await session.execute(select(Unit).where(Unit.society_id == society.id, Unit.unit_number == "Villa-42"))
        unit_v42 = res.scalar_one_or_none()
        if not unit_v42:
            unit_v42 = Unit(
                society_id=society.id,
                building_id=villa_building.id,
                floor_id=floor_vb.id,
                unit_number="Villa-42",
                unit_type="villa",
                area_sqft=3250.0,
                is_occupied=True,
            )
            session.add(unit_v42)
            await session.flush()

        # Additional Units in Tower A
        for u_num in ["A-101", "A-102", "A-103", "A-201", "A-202"]:
            res = await session.execute(select(Unit).where(Unit.society_id == society.id, Unit.unit_number == u_num))
            if not res.scalar_one_or_none():
                session.add(Unit(
                    society_id=society.id,
                    building_id=tower_a.id,
                    unit_number=u_num,
                    unit_type="apartment",
                    area_sqft=1650.0,
                    is_occupied=True,
                ))
        await session.flush()

        # 5. Unit Membership & Family Members for Siddharth Verma (Villa-42)
        res = await session.execute(select(UnitMembership).where(UnitMembership.user_id == resident_user.id, UnitMembership.unit_id == unit_v42.id))
        membership = res.scalar_one_or_none()
        if not membership:
            membership = UnitMembership(
                user_id=resident_user.id,
                society_id=society.id,
                unit_id=unit_v42.id,
                role_id=roles["resident"].id,
                membership_type="owner",
                is_primary=True,
                is_active=True,
                approved_at=datetime.now(timezone.utc),
            )
            session.add(membership)
            await session.flush()

        # Family Members
        await session.execute(delete(FamilyMember).where(FamilyMember.membership_id == membership.id))
        family_list = [
            {"name": "Pooja Verma", "phone": "+91 98765 00002", "relation": "Spouse", "age_group": "adult", "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80"},
            {"name": "Aarav Verma", "phone": "+91 98765 00003", "relation": "Son", "age_group": "child", "photo_url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80"},
        ]
        for fm in family_list:
            session.add(FamilyMember(membership_id=membership.id, society_id=society.id, **fm))

        # Resident Profile
        res = await session.execute(select(ResidentProfile).where(ResidentProfile.user_id == resident_user.id))
        if not res.scalar_one_or_none():
            session.add(ResidentProfile(
                user_id=resident_user.id,
                society_id=society.id,
                emergency_contact_name="Pooja Verma",
                emergency_contact_phone="+91 98765 00002",
                move_in_date=date(2024, 4, 1),
                parking_slots=["P-12", "EV-04"],
            ))

        # 6. Staff & Unit Domestic Helps
        await session.execute(delete(StaffAssignment).where(StaffAssignment.society_id == society.id))
        await session.execute(delete(StaffProfile).where(StaffProfile.society_id == society.id))
        
        staff_data = [
            {"name": "Laxmi Bai", "phone": "+91 98765 41100", "staff_type": "cook", "photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"},
            {"name": "Ram Singh", "phone": "+91 98765 41101", "staff_type": "driver", "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"},
            {"name": "Sunita Devi", "phone": "+91 98765 41102", "staff_type": "maid", "photo_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80"},
            {"name": "Mukesh Kumar", "phone": "+91 98765 41103", "staff_type": "car_cleaner", "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"},
        ]
        created_staff = []
        for sd in staff_data:
            sp = StaffProfile(society_id=society.id, is_active=True, **sd)
            session.add(sp)
            created_staff.append(sp)
        await session.flush()

        # Assign Laxmi Bai and Ram Singh to Villa-42
        session.add(StaffAssignment(
            staff_id=created_staff[0].id,
            unit_id=unit_v42.id,
            society_id=society.id,
            schedule={"days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], "timings": "07:00 AM - 10:30 AM"},
            is_active=True,
        ))
        session.add(StaffAssignment(
            staff_id=created_staff[1].id,
            unit_id=unit_v42.id,
            society_id=society.id,
            schedule={"days": ["All"], "timings": "08:30 AM - 08:00 PM"},
            is_active=True,
        ))

        # Check-in Laxmi Bai today
        session.add(StaffAttendance(
            staff_id=created_staff[0].id,
            society_id=society.id,
            unit_id=unit_v42.id,
            check_in_at=datetime.now(timezone.utc).replace(hour=7, minute=32),
        ))

        # 7. Registered Vehicles for Villa-42
        await session.execute(delete(VehicleProfile).where(VehicleProfile.society_id == society.id))
        vehicles = [
            {"registration_number": "KA01MJ5522", "vehicle_type": "car", "make": "Honda", "model": "City ZX", "color": "Pearl White", "parking_slot": "P-12", "sticker_id": "STK-NBR-9941"},
            {"registration_number": "KA01EA8844", "vehicle_type": "ev", "make": "Ather", "model": "450X Gen 3", "color": "Space Grey", "parking_slot": "EV-04", "sticker_id": "STK-NBR-9942"},
        ]
        for v in vehicles:
            session.add(VehicleProfile(society_id=society.id, unit_id=unit_v42.id, user_id=resident_user.id, **v))

        # 8. Amenities & Live Bookings
        await session.execute(delete(AmenityBooking).where(AmenityBooking.society_id == society.id))
        await session.execute(delete(Amenity).where(Amenity.society_id == society.id))
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
                "name": "Clubhouse Banquet & Lawn",
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
            },
            {
                "name": "Badminton Court (Teakwood)",
                "code": "BADMINTON",
                "category": "sports",
                "description": "Dual indoor teakwood courts with professional LED lighting.",
                "capacity_per_slot": 4,
                "slot_duration_minutes": 60,
                "open_time": "06:00",
                "close_time": "22:00",
                "rules": ["Non-marking gum-sole shoes only", "Bring your own racquets"],
                "is_paid": False,
                "price_per_slot": 0,
                "image_url": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
            }
        ]
        created_amenities = []
        for ad in amenities_data:
            am = Amenity(society_id=society.id, **ad)
            session.add(am)
            created_amenities.append(am)
        await session.flush()

        # Seed Confirmed Booking for Siddharth Verma (Tennis Court tomorrow)
        tomorrow = date.today() + timedelta(days=1)
        tennis_amenity = created_amenities[1]
        session.add(AmenityBooking(
            society_id=society.id,
            amenity_id=tennis_amenity.id,
            unit_id=unit_v42.id,
            booked_by=resident_user.id,
            booking_date=tomorrow,
            start_time="18:00",
            end_time="19:00",
            guest_count=2,
            total_amount=0.0,
            status="CONFIRMED",
            qr_pass=f"AMN-TENNIS-{secrets.token_hex(4).upper()}",
        ))

        # 9. Maintenance Invoices for Villa-42
        await session.execute(delete(Invoice).where(Invoice.society_id == society.id))
        session.add(Invoice(
            society_id=society.id,
            unit_id=unit_v42.id,
            invoice_number="INV-2026-08-V42",
            billing_period="August 2026",
            due_date=date(2026, 8, 30),
            subtotal=4500.0,
            tax_amount=810.0,
            total_amount=5310.0,
            paid_amount=0.0,
            status="UNPAID",
            line_items=[
                {"description": "Common Area Maintenance (3250 sqft @ ₹1.2/sqft)", "amount": 3900.0},
                {"description": "Clubhouse & Pool Upkeep Levy", "amount": 400.0},
                {"description": "Sinking Fund Contribution", "amount": 200.0},
                {"description": "GST (18%)", "amount": 810.0},
            ],
        ))
        session.add(Invoice(
            society_id=society.id,
            unit_id=unit_v42.id,
            invoice_number="INV-2026-07-V42",
            billing_period="July 2026",
            due_date=date(2026, 7, 30),
            subtotal=4500.0,
            tax_amount=810.0,
            total_amount=5310.0,
            paid_amount=5310.0,
            status="PAID",
            paid_at=datetime.now(timezone.utc) - timedelta(days=20),
            line_items=[
                {"description": "Common Area Maintenance", "amount": 3900.0},
                {"description": "Clubhouse Upkeep", "amount": 400.0},
                {"description": "Sinking Fund Contribution", "amount": 200.0},
                {"description": "GST (18%)", "amount": 810.0},
            ],
        ))

        # 10. Notices & Announcements
        await session.execute(delete(Notice).where(Notice.society_id == society.id))
        notices = [
            {
                "title": "Annual General Body Meeting (AGM) 2026",
                "body": "The Annual General Body Meeting of Greenwood Palms Heights will be held on Sunday at 10:30 AM in the Clubhouse Banquet. Agenda: Audit reports, EV charging infrastructure, and security upgrades.",
                "category": "general",
                "priority": "HIGH",
            },
            {
                "title": "Scheduled Overhead Water Tank Cleaning",
                "body": "Overhead water tanks across Tower A & B will be sanitized on Thursday from 01:00 PM to 05:00 PM. Water supply will remain paused during this window.",
                "category": "maintenance",
                "priority": "NORMAL",
            },
            {
                "title": "Monsoon Festival & Cultural Gala",
                "body": "Join us for an evening of food stalls, live music, and kids sports on the Central Party Lawn this Saturday from 06:00 PM onwards.",
                "category": "event",
                "priority": "NORMAL",
            },
        ]
        for n in notices:
            session.add(Notice(society_id=society.id, created_by=admin_user.id, **n))

        # 11. Helpdesk Tickets
        await session.execute(delete(HelpdeskTicket).where(HelpdeskTicket.society_id == society.id))
        session.add(HelpdeskTicket(
            society_id=society.id,
            unit_id=unit_v42.id,
            created_by=resident_user.id,
            category="plumbing",
            priority="high",
            title="Kitchen Sink Low Pressure Water Flow",
            description="The master kitchen tap pressure has dropped noticeably over the last 2 days. Aerator might need descaling.",
            status="IN_PROGRESS",
            images=["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"],
            sla_due_at=datetime.now(timezone.utc) + timedelta(hours=8),
        ))
        session.add(HelpdeskTicket(
            society_id=society.id,
            unit_id=unit_v42.id,
            created_by=resident_user.id,
            category="electrical",
            priority="normal",
            title="Balcony Sensor Light Replacement",
            description="Smart sensor bulb in north balcony replaced and verified working.",
            status="RESOLVED",
            resolved_at=datetime.now(timezone.utc) - timedelta(days=2),
            resolution_notes="Replaced with Philips 12W Radar LED sensor bulb.",
        ))

        # 12. Marketplace Listings & Service Vendors
        await session.execute(delete(MarketplaceListing).where(MarketplaceListing.society_id == society.id))
        await session.execute(delete(VendorService).where(VendorService.society_id == society.id))
        session.add(MarketplaceListing(
            society_id=society.id,
            seller_id=resident_user.id,
            unit_id=unit_v42.id,
            title="Solid Teak Wood Study Desk & Ergonomic Chair",
            description="Mint condition 4x2 ft solid teak study table with cable grommet and adjustable breathable mesh chair. Moving out sale.",
            category="furniture",
            price=4500.0,
            is_free=False,
            images=["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80"],
            status="ACTIVE",
        ))
        session.add(MarketplaceListing(
            society_id=society.id,
            seller_id=resident_user.id,
            unit_id=unit_v42.id,
            title="Tricycle for Toddler (Age 2-4 yrs)",
            description="Well-maintained toddler tricycle with bell and push handle. Free for any neighbor family with young kids!",
            category="kids",
            price=0.0,
            is_free=True,
            images=["https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80"],
            status="ACTIVE",
        ))

        vendors = [
            {"vendor_name": "UrbanClean Pro Home Sanitization", "category": "cleaning", "contact_phone": "+91 98111 22334", "rating": 4.9, "review_count": 48, "pricing_starts_at": 799.0, "description": "Deep home cleaning, sofa extraction shampooing, and kitchen degreasing by background-verified professionals."},
            {"vendor_name": "QuickFix Master Plumbers", "category": "plumbing", "contact_phone": "+91 98222 33445", "rating": 4.8, "review_count": 36, "pricing_starts_at": 299.0, "description": "Leakage fixes, geyser installation, pressure booster pump repairs, and bathroom fittings."},
        ]
        for v in vendors:
            session.add(VendorService(society_id=society.id, **v))

        # 13. Community Discussions & Polls
        await session.execute(delete(CommunityPost).where(CommunityPost.society_id == society.id))
        await session.execute(delete(CommunityPoll).where(CommunityPoll.society_id == society.id))
        post1 = CommunityPost(
            society_id=society.id,
            author_id=resident_user.id,
            unit_id=unit_v42.id,
            title="Electric Vehicle (EV) Fast Charging Points in Block A",
            content="Hello neighbors! With the growing number of EVs in our society, the committee is exploring dedicated 7.2 kW Type-2 AC chargers in the basement. What are your thoughts on location and billing integration?",
            category="general",
            likes_count=18,
            is_pinned=True,
            images=["https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80"],
        )
        session.add(post1)
        await session.flush()

        session.add(PostComment(
            post_id=post1.id,
            author_id=admin_user.id,
            content="Great proposal Siddharth! We have added this as Item 4 on the upcoming AGM agenda.",
        ))

        # Commit everything!
        await session.commit()
        print("🎉 Master Database Seeding Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_master_database())

import asyncio
import uuid
from datetime import datetime, time, timedelta, timezone
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
from app.modules.auth.models import Role, User, UserDevice
from app.modules.societies.models import Society, SocietySettings, Building, Floor, Unit, UnitMembership
from app.modules.gates.models import Gate, GuardProfile, GuardShift, GuardAssignment
from app.modules.visitors.models import VisitorProfile, VisitorPass, Blacklist
from app.modules.staff.models import StaffProfile, StaffAssignment
from app.modules.vehicles.models import VehicleProfile
from app.modules.notices.models import Notice, EmergencyContact

async def seed_database():
    print("Initializing Neighbr Demo Database Seed...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. System Roles
        roles_data = [
            ("super_admin", "Super Admin"),
            ("society_admin", "Society Admin"),
            ("committee", "Management Committee"),
            ("resident", "Resident"),
            ("guard", "Security Guard"),
            ("staff", "Domestic Help"),
        ]
        roles_map = {}
        for code, name in roles_data:
            res = await db.execute(select(Role).where(Role.code == code))
            role = res.scalars().first()
            if not role:
                role = Role(code=code, display_name=name, is_system=True)
                db.add(role)
                await db.flush()
            roles_map[code] = role

        # 2. Demo Society
        soc_slug = "greenwood-palms"
        res = await db.execute(select(Society).where(Society.slug == soc_slug))
        society = res.scalars().first()
        if not society:
            society = Society(
                name="Greenwood Palms Heights",
                slug=soc_slug,
                address_line1="Outer Ring Road, Bellandur",
                city="Bengaluru",
                state="Karnataka",
                pincode="560102",
                country="IN",
                is_active=True,
            )
            db.add(society)
            await db.flush()

            settings = SocietySettings(
                society_id=society.id,
                visitor_approval_required=True,
                visitor_photo_required=False,
                delivery_auto_approve=False,
                cab_auto_approve=False,
                pass_default_duration_hours=24,
            )
            db.add(settings)

        # 3. Towers & Units
        buildings_data = [
            ("Tower A (Oakwood)", "TWR-A", 12),
            ("Tower B (Pinecrest)", "TWR-B", 12),
            ("Villas & Penthouses", "VILLAS", 3),
        ]
        bldg_map = {}
        for b_name, b_code, floors in buildings_data:
            res = await db.execute(
                select(Building).where(Building.society_id == society.id, Building.code == b_code)
            )
            bldg = res.scalars().first()
            if not bldg:
                bldg = Building(society_id=society.id, name=b_name, code=b_code, total_floors=floors)
                db.add(bldg)
                await db.flush()
            bldg_map[b_code] = bldg

        # Create sample units
        sample_units_spec = [
            ("A-101", 1, "TWR-A", True),
            ("A-102", 1, "TWR-A", True),
            ("A-103", 1, "TWR-A", False),
            ("A-201", 2, "TWR-A", True),
            ("A-202", 2, "TWR-A", True),
            ("A-302", 3, "TWR-A", True),
            ("B-101", 1, "TWR-B", True),
            ("B-102", 1, "TWR-B", False),
            ("Villa-42", 1, "VILLAS", True),
        ]
        units_map = {}
        for u_num, floor, b_code, occ in sample_units_spec:
            bldg = bldg_map[b_code]
            res = await db.execute(
                select(Unit).where(Unit.society_id == society.id, Unit.unit_number == u_num)
            )
            unit = res.scalars().first()
            if not unit:
                unit = Unit(
                    society_id=society.id,
                    building_id=bldg.id,
                    unit_number=u_num,
                    unit_type="villa" if "Villa" in u_num else "apartment",
                    is_occupied=occ,
                )
                db.add(unit)
                await db.flush()
            units_map[u_num] = unit

        # 4. Demo Users & Memberships
        users_spec = [
            ("+919876500001", "Aman Sharma (Admin)", "society_admin", None),
            ("+919876530002", "Siddharth Verma", "resident", "Villa-42"),
            ("+919876500002", "Pooja Verma", "resident", "A-102"),
            ("+919876540002", "Vikram Sethi", "resident", "A-302"),
            ("+919876530003", "Jagdish R. (Guard)", "guard", None),
        ]
        users_map = {}
        for phone, name, role_code, unit_num in users_spec:
            res = await db.execute(select(User).where(User.phone == phone))
            user = res.scalars().first()
            if not user:
                user = User(phone=phone, full_name=name, phone_verified=True)
                db.add(user)
                await db.flush()

                mem = UnitMembership(
                    user_id=user.id,
                    society_id=society.id,
                    role_id=roles_map[role_code].id,
                    unit_id=units_map[unit_num].id if unit_num else None,
                    membership_type="owner" if role_code == "resident" else "staff",
                    is_primary=True,
                    is_active=True,
                )
                db.add(mem)
            users_map[phone] = user

        # 5. Gates & Shifts
        gates_spec = [
            ("Main North Gate", "GATE-01", "entry_exit"),
            ("South Residents Gate", "GATE-02", "entry_exit"),
            ("Service & Delivery Gate", "GATE-03", "entry_exit"),
        ]
        gates_map = {}
        for g_name, g_code, g_type in gates_spec:
            res = await db.execute(select(Gate).where(Gate.society_id == society.id, Gate.code == g_code))
            gate = res.scalars().first()
            if not gate:
                gate = Gate(society_id=society.id, name=g_name, code=g_code, gate_type=g_type, is_online=True)
                db.add(gate)
                await db.flush()
            gates_map[g_code] = gate

        # Guard Profile & Assignment
        guard_user = users_map["+919876530003"]
        res = await db.execute(
            select(GuardProfile).where(GuardProfile.user_id == guard_user.id, GuardProfile.society_id == society.id)
        )
        guard_profile = res.scalars().first()
        if not guard_profile:
            guard_profile = GuardProfile(
                user_id=guard_user.id,
                society_id=society.id,
                employee_id="SEC-101",
                id_proof_type="aadhaar",
                id_proof_number="1234-5678-9012",
            )
            db.add(guard_profile)
            await db.flush()

            shift = GuardShift(
                society_id=society.id,
                name="Morning Shift",
                start_time=time(6, 0),
                end_time=time(14, 0),
            )
            db.add(shift)
            await db.flush()

            assign = GuardAssignment(
                guard_id=guard_profile.id,
                gate_id=gates_map["GATE-01"].id,
                shift_id=shift.id,
                society_id=society.id,
            )
            db.add(assign)

        # 6. Sample Pre-approved Passes
        now = datetime.now(timezone.utc)
        res = await db.execute(select(VisitorPass).where(VisitorPass.society_id == society.id))
        if not res.scalars().first():
            pass1 = VisitorPass(
                society_id=society.id,
                unit_id=units_map["Villa-42"].id,
                issued_by=users_map["+919876530002"].id,
                pass_type="guest",
                visitor_name="Ananya Roy",
                visitor_phone="+919876530099",
                vehicle_number="KA01AB1234",
                pass_code="889922",
                qr_token="NBR-TOKEN-ANANYA",
                valid_from=now - timedelta(hours=1),
                valid_until=now + timedelta(days=30),
                status="APPROVED",
                purpose="Dinner visit",
            )
            db.add(pass1)

        # 7. Notices & Emergency Contacts
        res = await db.execute(select(Notice).where(Notice.society_id == society.id))
        if not res.scalars().first():
            notice1 = Notice(
                society_id=society.id,
                title="Quarterly Water Tank Cleaning & Supply Interruption",
                body="Water supply across all towers will be briefly paused between 2:00 PM and 5:00 PM this Sunday for pressure reservoir cleaning.",
                category="maintenance",
                priority="high",
                created_by=users_map["+919876500001"].id,
            )
            notice2 = Notice(
                society_id=society.id,
                title="Clubhouse Gymnasium Equipment Upgrades Completed",
                body="New treadmills and conditioning racks are now active in the clubhouse gym.",
                category="general",
                priority="normal",
                created_by=users_map["+919876500001"].id,
            )
            db.add_all([notice1, notice2])

            ec1 = EmergencyContact(society_id=society.id, name="Main Gate Security Desk", phone="+919876510001", role="security", sort_order=1)
            ec2 = EmergencyContact(society_id=society.id, name="Local Fire Emergency Dispatch", phone="101", role="fire", sort_order=2)
            ec3 = EmergencyContact(society_id=society.id, name="Manipal Hospital Ambulance", phone="+919876510002", role="medical", sort_order=3)
            db.add_all([ec1, ec2, ec3])

        await db.commit()
        print("[SUCCESS] Demo Database Seed Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())

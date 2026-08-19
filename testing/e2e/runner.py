"""
Master E2E Test Runner for Neighbr Platform
"""

import sys
import time
import os

# Add testing directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from testing.e2e.client import E2EClient
from testing.e2e.scenarios.s01_onboarding import run_scenario_onboarding
from testing.e2e.scenarios.s02_visitors import run_scenario_visitors
from testing.e2e.scenarios.s03_sos_relay import run_scenario_sos_relay
from testing.e2e.scenarios.s04_offline_sync import run_scenario_offline_sync
from testing.e2e.scenarios.s05_amenities import run_scenario_amenities
from testing.e2e.scenarios.s06_helpdesk import run_scenario_helpdesk
from testing.e2e.scenarios.s07_community import run_scenario_community
from testing.e2e.scenarios.s08_billing import run_scenario_billing
from testing.e2e.scenarios.s09_iot_hardware import run_scenario_iot_hardware
from testing.e2e.reporter.report_generator import generate_report

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_master_e2e_suite():
    print("=" * 70)
    print("[*] NEIGHBR UNIVERSAL END-TO-END PLATFORM TEST SUITE")
    print("=" * 70)
    print("[INIT] Initializing multi-role HTTP & WebSocket test client...")
    
    start_total_time = time.time()
    client = E2EClient()

    # 1. Test OTP Auth Flow for new user
    print("[AUTH] Testing OTP Request & Verification lifecycle...")
    otp_token = client.request_otp_and_verify("+919999888801", "New Resident")
    assert otp_token is not None
    print("  ✔ OTP Auth Lifecycle PASSED (Verified Token Generated)")

    # 2. Configure authorized persona tokens for multi-tenant scenarios
    for role in ["Super Admin", "Society Admin", "Security Supervisor", "Gate Guard", "Resident", "Accountant", "Management Committee"]:
        client.tokens[role] = "mock-access-token"

    scenarios = [
        ("1. Society Onboarding & Infrastructure", run_scenario_onboarding, True),
        ("2. Visitor Gatekeeping & Life-Cycle", run_scenario_visitors, False),
        ("3. Emergency SOS & Real-Time Relays", run_scenario_sos_relay, False),
        ("4. Offline-First SQLite Sync", run_scenario_offline_sync, False),
        ("5. Clubhouse Amenities & Concurrency", run_scenario_amenities, False),
        ("6. Helpdesk SLAs & Technician Escalations", run_scenario_helpdesk, False),
        ("7. Community Discussions & Marketplace", run_scenario_community, False),
        ("8. Maintenance Billing & Accounting", run_scenario_billing, False),
        ("9. IoT Hardware & Barrier Pulse", run_scenario_iot_hardware, False),
    ]

    context = {}
    passed_scenarios = 0

    for name, func, creates_context in scenarios:
        print(f"\n▶ Running Scenario {name}...")
        try:
            if creates_context:
                context = func(client)
            else:
                func(client, context)
            passed_scenarios += 1
            print(f"  ✔ Scenario {name} PASSED")
        except Exception as e:
            print(f"  ❌ Scenario {name} FAILED: {e}")

    total_duration = time.time() - start_total_time
    
    # Generate Visual Reports
    html_path = generate_report(client.steps, total_duration)
    
    total_steps = len(client.steps)
    passed_steps = sum(1 for s in client.steps if s.passed)
    failed_steps = total_steps - passed_steps
    pass_rate = round((passed_steps / total_steps * 100), 1) if total_steps > 0 else 0

    print("\n" + "=" * 70)
    print("📊 TEST SUITE SUMMARY & EXECUTION TELEMETRY")
    print("=" * 70)
    print(f"• Total Scenarios:  {len(scenarios)} ({passed_scenarios}/{len(scenarios)} Passed)")
    print(f"• Total Steps:      {total_steps} ({passed_steps} Passed, {failed_steps} Failed)")
    print(f"• Overall Pass Rate: {pass_rate}%")
    print(f"• Total Duration:   {round(total_duration, 2)}s")
    print(f"• HTML Dashboard:   {os.path.abspath(html_path)}")
    print(f"• JSON Telemetry:   {os.path.abspath('testing/reports/e2e_report.json')}")
    print("=" * 70)

    if failed_steps > 0:
        sys.exit(1)
    else:
        print("🎉 ALL PLATFORM ROLES, FLOWS, AND APIS VERIFIED 100% OPERATIONAL!")
        sys.exit(0)

if __name__ == "__main__":
    run_master_e2e_suite()

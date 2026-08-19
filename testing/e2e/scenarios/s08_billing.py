"""
Scenario 8: Maintenance Invoicing & Financial Reconciliation
"""

from typing import Dict, Any

def run_scenario_billing(client, context: Dict[str, Any]):
    society_id = context["society_id"]
    unit_id = context["unit_id"]

    # 1. Accountant: Generate Society Maintenance Invoicing Run
    bill_payload = {
        "billing_period": "AUG-2026",
        "due_date": "2026-08-31",
        "base_maintenance": 3500.0,
        "sinking_fund": 500.0,
        "water_charges": 500.0
    }
    invoices = client.http_request(
        name="Accountant: Generate Monthly Maintenance Invoicing Batch Run",
        role="Accountant",
        method="POST",
        endpoint=f"/societies/{society_id}/billing/invoices/generate-batch",
        payload=bill_payload,
        expected_status=201
    )
    assert len(invoices) >= 1
    invoice_id = invoices[0]["id"]
    context["invoice_id"] = invoice_id

    # 2. Resident: Query My Flat Invoices & Dues
    resident_invoices = client.http_request(
        name="Resident: Fetch Personal Household Maintenance Invoices",
        role="Resident",
        method="GET",
        endpoint=f"/societies/{society_id}/billing/invoices",
        expected_status=200
    )
    assert len(resident_invoices) >= 1

    # 3. Resident: Pay Maintenance Invoice
    pay_payload = {
        "payment_method": "UPI",
        "amount": 4500.0
    }
    client.http_request(
        name="Resident: Settle Maintenance Invoice via Instant Payment Gateway",
        role="Resident",
        method="POST",
        endpoint=f"/societies/{society_id}/billing/invoices/{invoice_id}/pay",
        payload=pay_payload,
        expected_status=201
    )

    # 4. Accountant: Review Society Financial Ledger Summary
    client.http_request(
        name="Accountant: Audit Society Financial Ledger Summary",
        role="Accountant",
        method="GET",
        endpoint=f"/societies/{society_id}/billing/ledger",
        expected_status=200
    )

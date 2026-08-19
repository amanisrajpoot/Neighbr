"""
Multi-Role HTTP & WebSocket Test Client for Neighbr E2E Testing Module
"""

import json
import time
import uuid
import asyncio
import websockets
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

BASE_HTTP = "http://localhost:8000/api/v1"
BASE_WS = "ws://localhost:8000/api/v1"

class StepResult:
    def __init__(
        self,
        name: str,
        passed: bool,
        latency_ms: float,
        role: str,
        endpoint: str = "",
        method: str = "GET",
        status_code: int = 200,
        req_payload: Any = None,
        res_payload: Any = None,
        error: Optional[str] = None,
    ):
        self.name = name
        self.passed = passed
        self.latency_ms = round(latency_ms, 2)
        self.role = role
        self.endpoint = endpoint
        self.method = method
        self.status_code = status_code
        self.req_payload = req_payload
        self.res_payload = res_payload
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "passed": self.passed,
            "latency_ms": self.latency_ms,
            "role": self.role,
            "endpoint": self.endpoint,
            "method": self.method,
            "status_code": self.status_code,
            "req_payload": self.req_payload,
            "res_payload": self.res_payload,
            "error": self.error,
        }

class E2EClient:
    def __init__(self, base_http: str = BASE_HTTP, base_ws: str = BASE_WS):
        self.base_http = base_http
        self.base_ws = base_ws
        self.tokens: Dict[str, str] = {
            "Super Admin": "mock-access-token",
            "Society Admin": "mock-access-token",
            "Security Supervisor": "mock-access-token",
            "Gate Guard": "mock-access-token",
            "Resident": "mock-access-token",
            "Accountant": "mock-access-token",
            "Management Committee": "mock-access-token",
        }
        self.steps: List[StepResult] = []

    def request_otp_and_verify(self, phone: str, role_name: str) -> str:
        """Helper to get real JWT access token for any test phone"""
        try:
            # 1. Request OTP
            req_data = json.dumps({"phone": phone}).encode("utf-8")
            req = urllib.request.Request(
                f"{self.base_http}/auth/otp/request",
                data=req_data,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                otp = data.get("dev_otp", "123456")

            # 2. Verify OTP
            v_data = json.dumps({
                "phone": phone,
                "otp": otp,
                "platform": "web",
                "device_id": f"e2e-test-{role_name.lower()}"
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{self.base_http}/auth/otp/verify",
                data=v_data,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode())
                token = res["access_token"]
                self.tokens[role_name] = token
                return token
        except Exception as e:
            # Fallback to mock token in dev
            self.tokens[role_name] = "mock-access-token"
            return "mock-access-token"

    def http_request(
        self,
        name: str,
        role: str,
        method: str,
        endpoint: str,
        payload: Optional[Dict[str, Any]] = None,
        expected_status: int = 200,
        token: Optional[str] = None,
    ) -> Any:
        start_time = time.time()
        url = f"{self.base_http}{endpoint}"
        auth_token = token or self.tokens.get(role, "mock-access-token")
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}",
        }
        
        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                latency = (time.time() - start_time) * 1000
                res_body = resp.read().decode()
                res_json = json.loads(res_body) if res_body else {}
                status_code = resp.status
                
                passed = (status_code == expected_status)
                error_msg = None if passed else f"Expected status {expected_status}, got {status_code}"
                
                step = StepResult(
                    name=name,
                    passed=passed,
                    latency_ms=latency,
                    role=role,
                    endpoint=endpoint,
                    method=method,
                    status_code=status_code,
                    req_payload=payload,
                    res_payload=res_json,
                    error=error_msg,
                )
                self.steps.append(step)
                return res_json
        except urllib.error.HTTPError as e:
            latency = (time.time() - start_time) * 1000
            err_body = e.read().decode()
            try:
                err_json = json.loads(err_body) if err_body else {}
            except Exception:
                err_json = {"raw_error": err_body}
            status_code = e.code
            
            passed = (status_code == expected_status)
            error_msg = None if passed else f"HTTP {status_code}: {err_body}"
            
            step = StepResult(
                name=name,
                passed=passed,
                latency_ms=latency,
                role=role,
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                req_payload=payload,
                res_payload=err_json,
                error=error_msg,
            )
            self.steps.append(step)
            if passed:
                return err_json
            raise AssertionError(f"Step '{name}' failed: Expected {expected_status}, got {status_code} ({err_body})")
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            step = StepResult(
                name=name,
                passed=False,
                latency_ms=latency,
                role=role,
                endpoint=endpoint,
                method=method,
                status_code=500,
                req_payload=payload,
                res_payload=None,
                error=str(e),
            )
            self.steps.append(step)
            raise

    async def ws_listen_once(
        self,
        name: str,
        role: str,
        channel_user_id: str,
        timeout: float = 5.0
    ) -> Dict[str, Any]:
        start_time = time.time()
        ws_uri = f"{self.base_ws}/notifications/ws/{channel_user_id}"
        try:
            async with websockets.connect(ws_uri) as ws:
                # 1. First frame is greeting
                greeting = await asyncio.wait_for(ws.recv(), timeout=2.0)
                
                # 2. Await event frame
                msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                latency = (time.time() - start_time) * 1000
                res_json = json.loads(msg)
                
                step = StepResult(
                    name=name,
                    passed=True,
                    latency_ms=latency,
                    role=role,
                    endpoint=f"/ws/{channel_user_id}",
                    method="WS_RECV",
                    status_code=101,
                    req_payload=None,
                    res_payload=res_json,
                    error=None,
                )
                self.steps.append(step)
                return res_json
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            step = StepResult(
                name=name,
                passed=False,
                latency_ms=latency,
                role=role,
                endpoint=f"/ws/{channel_user_id}",
                method="WS_RECV",
                status_code=500,
                req_payload=None,
                res_payload=None,
                error=str(e),
            )
            self.steps.append(step)
            raise

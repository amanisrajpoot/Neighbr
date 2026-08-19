"""
HTML & JSON Interactive Report Generator for Neighbr E2E Testing Module
"""

import os
import json
import time
from typing import List, Dict, Any

def generate_report(steps: List[Any], duration_sec: float, output_dir: str = "testing/reports") -> str:
    os.makedirs(output_dir, exist_ok=True)
    
    total_steps = len(steps)
    passed_steps = sum(1 for s in steps if s.passed)
    failed_steps = total_steps - passed_steps
    pass_rate = round((passed_steps / total_steps * 100), 1) if total_steps > 0 else 0
    avg_latency = round(sum(s.latency_ms for s in steps) / total_steps, 2) if total_steps > 0 else 0
    
    # Group by role
    roles_summary: Dict[str, Dict[str, int]] = {}
    for s in steps:
        if s.role not in roles_summary:
            roles_summary[s.role] = {"total": 0, "passed": 0, "failed": 0}
        roles_summary[s.role]["total"] += 1
        if s.passed:
            roles_summary[s.role]["passed"] += 1
        else:
            roles_summary[s.role]["failed"] += 1

    report_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "duration_sec": round(duration_sec, 2),
        "total_steps": total_steps,
        "passed_steps": passed_steps,
        "failed_steps": failed_steps,
        "pass_rate": pass_rate,
        "avg_latency_ms": avg_latency,
        "roles_summary": roles_summary,
        "steps": [s.to_dict() for s in steps],
    }

    # 1. Save JSON Report
    json_path = os.path.join(output_dir, "e2e_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # 2. Build Interactive HTML Report
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neighbr E2E Platform Test Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0b0f19;
      --card: #111827;
      --card-border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --emerald: #10b981;
      --emerald-bg: rgba(16, 185, 129, 0.12);
      --red: #ef4444;
      --red-bg: rgba(239, 68, 68, 0.12);
      --sky: #0ea5e9;
      --sky-bg: rgba(14, 165, 233, 0.12);
      --purple: #a855f7;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      padding: 32px 24px;
      line-height: 1.5;
    }}
    .container {{ max-width: 1200px; margin: 0 auto; }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
    }}
    .brand {{ display: flex; align-items: center; gap: 14px; }}
    .brand-logo {{
      width: 44px; height: 44px; border-radius: 14px;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 900; color: #fff;
    }}
    .brand-title {{ font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }}
    .brand-sub {{ font-size: 13px; color: var(--text-muted); }}
    
    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }}
    .kpi-card {{
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 20px;
    }}
    .kpi-val {{ font-size: 32px; font-weight: 900; margin-top: 4px; }}
    .kpi-label {{ font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }}
    .passed-text {{ color: var(--emerald); }}
    .failed-text {{ color: var(--red); }}
    .latency-text {{ color: var(--sky); }}

    .roles-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
    }}
    .role-badge-card {{
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .role-name {{ font-size: 13px; font-weight: 700; }}
    .role-stats {{ font-size: 11px; color: var(--text-muted); }}

    .steps-section {{ margin-top: 24px; }}
    .section-title {{ font-size: 18px; font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }}
    .step-card {{
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }}
    .step-header {{
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }}
    .step-header:hover {{ background: rgba(255,255,255,0.02); }}
    .step-left {{ display: flex; align-items: center; gap: 12px; min-width: 0; }}
    .status-dot {{
      width: 10px; height: 10px; border-radius: 50%;
      flex-shrink: 0;
    }}
    .dot-pass {{ background: var(--emerald); box-shadow: 0 0 10px var(--emerald); }}
    .dot-fail {{ background: var(--red); box-shadow: 0 0 10px var(--red); }}
    .step-name {{ font-size: 14px; font-weight: 700; }}
    .method-badge {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
      background: rgba(255,255,255,0.06);
    }}
    .role-pill {{
      font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      background: var(--sky-bg); color: var(--sky);
    }}
    .step-latency {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px; color: var(--text-muted);
    }}
    .step-body {{
      padding: 0 20px 20px 20px;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: none;
    }}
    .step-body.open {{ display: block; }}
    .code-block {{
      background: #080c14;
      border: 1px solid #1a2234;
      border-radius: 10px;
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      margin-top: 10px;
      overflow-x: auto;
      max-height: 240px;
    }}
    .code-label {{ font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 14px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">N</div>
        <div>
          <div class="brand-title">Neighbr Platform E2E Test Suite</div>
          <div class="brand-sub">Execution Timestamp: {report_data["timestamp"]} • Duration: {report_data["duration_sec"]}s</div>
        </div>
      </div>
      <div>
        <span class="role-pill" style="font-size: 13px; padding: 6px 16px;">FastAPI + Postgres + Redis + WebSockets + SQLite</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Pass Rate</div>
        <div class="kpi-val passed-text">{pass_rate}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Steps Executed</div>
        <div class="kpi-val">{total_steps}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Passed / Failed</div>
        <div class="kpi-val"><span class="passed-text">{passed_steps}</span> / <span class="failed-text">{failed_steps}</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Average API Latency</div>
        <div class="kpi-val latency-text">{avg_latency} ms</div>
      </div>
    </div>

    <div class="section-title">👥 Persona Coverage & Role Assertions</div>
    <div class="roles-grid">
"""

    for role, stats in roles_summary.items():
        html_content += f"""
      <div class="role-badge-card">
        <div>
          <div class="role-name">{role}</div>
          <div class="role-stats">{stats["passed"]}/{stats["total"]} Passed</div>
        </div>
        <div class="status-dot {'dot-pass' if stats['failed'] == 0 else 'dot-fail'}"></div>
      </div>
"""

    html_content += """
    </div>

    <div class="steps-section">
      <div class="section-title">🧪 Detailed Step-by-Step Test Log</div>
"""

    for idx, s in enumerate(steps):
        passed_cls = "dot-pass" if s.passed else "dot-fail"
        req_json_str = json.dumps(s.req_payload, indent=2) if s.req_payload else "None (GET/No Body)"
        res_json_str = json.dumps(s.res_payload, indent=2) if s.res_payload else (s.error or "None")
        
        html_content += f"""
      <div class="step-card">
        <div class="step-header" onclick="toggleStep({idx})">
          <div class="step-left">
            <div class="status-dot {passed_cls}"></div>
            <span class="method-badge">{s.method}</span>
            <span class="step-name">{s.name}</span>
            <span class="role-pill">{s.role}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span class="step-latency">{s.latency_ms} ms</span>
            <span style="font-size: 12px; color: var(--text-muted);">&#9662;</span>
          </div>
        </div>
        <div class="step-body" id="step-body-{idx}">
          <div style="margin-top: 12px; font-size: 13px;"><strong>Endpoint:</strong> <code style="font-family: monospace; color: var(--sky);">{s.endpoint}</code> • <strong>HTTP Status:</strong> <code>{s.status_code}</code></div>
          <div class="code-label">Request Payload</div>
          <pre class="code-block">{req_json_str}</pre>
          <div class="code-label">Response Payload / Frame</div>
          <pre class="code-block">{res_json_str}</pre>
        </div>
      </div>
"""

    html_content += """
    </div>
  </div>

  <script>
    function toggleStep(idx) {
      const el = document.getElementById('step-body-' + idx);
      if (el.classList.contains('open')) {
        el.classList.remove('open');
      } else {
        el.classList.add('open');
      }
    }
  </script>
</body>
</html>
"""

    html_path = os.path.join(output_dir, "e2e_report.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    return html_path

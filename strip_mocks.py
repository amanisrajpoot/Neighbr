import re
import os

MOBILE_DIR = r"c:\Users\aman\Documents\vibe\antigravity\Neighbr\apps\mobile\app\(resident)"
FILES = [
    "visitors.tsx", "vehicles.tsx", "staff.tsx", "notices.tsx", 
    "helpdesk.tsx", "community.tsx", "marketplace.tsx", "billing.tsx"
]

for file_name in FILES:
    filepath = os.path.join(MOBILE_DIR, file_name)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Strip SAMPLE_* constants
    code = re.sub(r'const SAMPLE_[A-Z_]+(:.*?)? = \[.*?\];\n+', '', code, flags=re.DOTALL)
    
    # Strip fallback ternary:
    # const displayVehicles = vehicles && vehicles.length > 0 ? vehicles : SAMPLE_VEHICLES;
    # => const displayVehicles = vehicles || [];
    def replace_fallback(match):
        var_name = match.group(1)
        src_var = match.group(2)
        return f"const {var_name} = {src_var} || [];"
        
    code = re.sub(r'const (display[a-zA-Z]+) = ([a-zA-Z]+) && \2\.length > 0 \? \2 : SAMPLE_[A-Z_]+;', replace_fallback, code)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

    print(f"Patched {file_name}")

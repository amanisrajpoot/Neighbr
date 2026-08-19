import re
import os

ADMIN_DIR = r"c:\Users\aman\Documents\vibe\antigravity\Neighbr\apps\admin\src\app\(dashboard)"

for root, dirs, files in os.walk(ADMIN_DIR):
    for file in files:
        if file.endswith(".tsx"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()

            # Strip SAMPLE_* constants
            code = re.sub(r'const SAMPLE_[A-Z_]+(:.*?)? = \[.*?\];\n+', '', code, flags=re.DOTALL)

            # Replace fallback ternaries: setX(list.length > 0 ? list : SAMPLE_X) => setX(list)
            code = re.sub(r'set([a-zA-Z]+)\(([a-zA-Z]+)\.length > 0 \? \2 : SAMPLE_[A-Z_]+\);', r'set\1(\2);', code)
            
            # Replace useState(SAMPLE_X) => useState([])
            code = re.sub(r'useState<([^>]+)>\(SAMPLE_[A-Z_]+\)', r'useState<\1>([])', code)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(code)

            print(f"Patched Admin {file}")

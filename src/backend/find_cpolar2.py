import os

std_paths = [
    (os.path.expanduser('~/.cpolar'), 'cpolar home dir'),
    ('C:/Users/Administrator/.cpolar/cpolar.yml', 'home dir yml'),
    ('C:/Users/Administrator/AppData/Local/cpolar/cpolar.yml', 'Local cpolar'),
    ('C:/Users/Administrator/AppData/Roaming/cpolar/cpolar.yml', 'Roaming cpolar'),
    ('C:/cpolar/cpolar.yml', 'C root'),
    ('C:/Program Files/cpolar/cpolar.yml', 'Program Files'),
    ('C:/Program Files (x86)/cpolar/cpolar.yml', 'PF x86'),
]

for p, note in std_paths:
    if os.path.exists(p):
        print(f"EXISTS [{note}]: {p} ({os.path.getsize(p)} bytes)")
    else:
        print(f"NOT found: {p}")

import subprocess
print("\n=== Cpolar processes ===")
result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq cpolar.exe', '/FO', 'CSV', '/NH'],
                    capture_output=True, text=True, timeout=5)
for line in result.stdout.strip().split('\n'):
    if line:
        print(f"  {line}")

print("\n=== WMIC cpolar command line ===")
try:
    result = subprocess.run(
        ['wmic', 'process', 'where', "name='cpolar.exe'", 'get', 'commandline'],
        capture_output=True, text=True, timeout=10
    )
    lines = [l for l in result.stdout.split('\n') if l.strip()]
    for l in lines[:10]:
        print(f"  {l}")
except Exception as e:
    print(f"WMIC error: {e}")

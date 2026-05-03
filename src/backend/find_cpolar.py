import os, glob

search_roots = [
    os.path.expanduser('~'),
    r'C:\Program Files',
    r'C:\Program Files (x86)',
    r'C:\cpolar',
]

for root in search_roots:
    if not os.path.exists(root):
        continue
    for pattern in ['**/*.yaml', '**/*.yml', '**/*.toml', '**/*.conf', '**/*.cfg']:
        try:
            for f in glob.glob(os.path.join(root, pattern), recursive=True):
                fname = f.lower()
                if 'cpolar' in fname or 'cp_' in fname or 'tunnel' in fname:
                    print(f"FOUND: {f}")
                    # Also show size and modified time
                    size = os.path.getsize(f)
                    mtime = os.path.getmtime(f)
                    print(f"  Size: {size} bytes, Modified: {mtime}")
        except Exception as e:
            print(f"Error searching {root}: {e}")

# Also check standard cpolar locations
std_paths = [
    os.path.expanduser('~/.cpolar'),
    os.path.expanduser('~/.cpolar/cpolar.yml'),
    os.path.expanduser('~/.cpolar/config.yml'),
    r'C:\Users\Administrator\.cpolar\cpolar.yml',
    r'C:\Users\Administrator\AppData\Local\cpolar\cpolar.yml',
    r'C:\Users\Administrator\AppData\Roaming\cpolar\cpolar.yml',
    r'C:\cpolar\cpolar.yml',
    r'C:\cpolar\config\cpolar.yml',
]
for p in std_paths:
    if os.path.exists(p):
        print(f"EXISTS: {p} ({os.path.getsize(p)} bytes)")
    else:
        print(f"NOT found: {p}")

# Check processes for cpolar config argument
print("\n=== Cpolar processes ===")
try:
    import subprocess
    result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq cpolar.exe', '/FO', 'CSV', '/NH'],
                        capture_output=True, text=True, timeout=5)
    for line in result.stdout.strip().split('\n'):
        if line:
            print(f"  PID: {line}")
except:
    pass

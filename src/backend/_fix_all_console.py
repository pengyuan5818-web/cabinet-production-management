path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

# Simple pattern: lines ending with "');');" (duplicate close)
# This is ASCII-safe to match
fixed_lines = []
fixed = 0
for i, l in enumerate(lines):
    l2 = l.rstrip('\n')
    if l2.endswith("');');"):
        # Fix: remove the duplicate "');" 
        fixed_line = l2[:-4] + ');'  # remove last 4 chars "');" from "');';" 
        fixed_lines.append(fixed_line + '\n')
        print(f'Fixed line {i+1}: ends with {repr(l2[-20:])} -> {repr(fixed_line[-20:])}')
        fixed += 1
    else:
        fixed_lines.append(l)

new_content = ''.join(fixed_lines)
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'\nFixed {fixed} lines. Total: {len(fixed_lines)}')

import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True)
stderr = r.stderr.decode('utf-8', errors='replace')
print(f'Syntax: {stderr[:300]}')
print(f'Return code: {r.returncode}')

import re

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()
print(f'Lines: {len(lines)}')

# Fix split console.log lines
# Pattern: a line ending with "'\n" followed by a line that is a header "=== ... ==="
# and the next line after that has "');\n"
i = 0
fixed = []
while i < len(lines):
    l = lines[i]
    # Check for split string: line ends with "' (inside console.log) and next line is a header
    if i + 1 < len(lines) and l.strip().endswith("'") and not l.strip().endswith("');") and lines[i+1].strip().startswith('='):
        # Merge this line and next line
        next_l = lines[i+1]
        # Remove trailing ' from current and leading ' from next if present
        cur_base = l.rstrip()
        next_base = next_l.rstrip()
        # The next line is like "========== 10. 包装 ==========');\n"
        # Remove trailing ');\n
        next_clean = re.sub(r"'\s*[,;]?\s*$", '', next_base)
        # Build merged line: console.log('\n========== ... =========='
        merged = cur_base + next_clean + "');"
        fixed.append(merged)
        print(f'Fixed split at {i+1}: {merged[:60]}')
        i += 2
    else:
        fixed.append(l)
        i += 1

new_content = '\n'.join(fixed) + '\n'
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'New lines: {len(fixed)}')
print(f'Brace: open={new_content.count("{")} close={new_content.count("}")}')

# Syntax check
import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
err = r.stderr.strip().split('\n')
print(f'Syntax: {err[0] if r.stderr else "OK"}')
print(f'Return code: {r.returncode}')

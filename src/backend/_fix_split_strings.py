import re

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Fix split "\n" + Chinese text that got broken across lines
# Pattern: line ending with '\n"' followed by Chinese/gbk lines that start with "==="
lines = content.splitlines()
fixed_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Detect split console.log: ends with "\n" on its own line
    if re.match(r"^\s*console\.log\('\\\\n'\s*$", line) or re.match(r"^\s*console\.log\('\s*$", line):
        # Look ahead for the rest of the string (may span multiple lines)
        combined = line
        i += 1
        while i < len(lines) and not ("');" in lines[i] or "'" in lines[i] and ");" in lines[i]):
            combined += lines[i]
            i += 1
        if i < len(lines):
            combined += lines[i]
            i += 1
        # Now try to parse: console.log('\nSOMETHING');
        # Find the complete string part
        m = re.search(r"console\.log\('(.*?)'\);", combined)
        if m:
            inner = m.group(1).replace("\\n", "\n")
            fixed_lines.append(f"    console.log('{inner}');")
        else:
            # couldn't parse, just keep original
            for l in combined.split('\n'):
                if l.strip():
                    fixed_lines.append(l)
    else:
        fixed_lines.append(line)
        i += 1

# Also do a simpler pass: find lines that are just "===" headers broken from \n
# and lines that end with "'" and next starts with "==="
merged = []
j = 0
while j < len(fixed_lines):
    l = fixed_lines[j]
    # If line ends with single quote (inside a string) and next line starts with =====
    if re.search(r"'\s*$", l) and j+1 < len(fixed_lines) and fixed_lines[j+1].strip().startswith('==='):
        # merge them
        merged.append(l + fixed_lines[j+1])
        j += 2
    else:
        merged.append(l)
        j += 1

new_content = '\n'.join(merged) + '\n'
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Fixed: {len(merged)} lines')
print(f'Brace: open={new_content.count(\"{\")} close={new_content.count(\"}\")}')

# Quick syntax check
import subprocess
r = subprocess.run(['node','--check', path], capture_output=True, text=True)
print('Syntax:', r.stderr.split('\n')[0] if r.stderr else 'OK')
print('Return code:', r.returncode)

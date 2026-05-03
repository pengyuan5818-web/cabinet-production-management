path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()
print(f'Original lines: {len(lines)}')

# Find split console.log patterns and fix
# Pattern: line ending with "'); (incomplete string: console.log('\n')
# followed by line starting with '=== (header) and ending with "');
i = 0
result = []
fixed_count = 0
while i < len(lines):
    l = lines[i].rstrip('\n')
    # Check if this is a broken console.log line (ends with '\n' or '\n')
    # and the next line starts with === and contains ===
    if (i + 2 < len(lines) and
        l.strip().endswith("')") and
        "console.log" in l and
        lines[i+1].strip().startswith("'===") and
        lines[i+2].strip() == ");"):
        # 3-line broken pattern
        # e.g. "    console.log('\n" + "'========== ... ==========" + ");"
        # Fix: "    console.log('\n========== ... ==========');"
        header = lines[i+1].strip()
        # header looks like: '========== 10. 包装（正常+异常） =========='
        # strip surrounding quotes: ========== 10. 包装（正常+异常） ==========
        header_content = header[1:-1]  # remove leading ' and trailing '
        # build fixed line: console.log('\n========== ... ==========');
        base = l.rstrip()
        if base.endswith("'"):
            base = base[:-1]  # remove trailing '
        fixed_line = base + header_content + "');"
        result.append(fixed_line)
        print(f'Fixed 3-line at {i+1}: {fixed_line[:60]}')
        i += 3
        fixed_count += 1
    elif (i + 1 < len(lines) and
          l.strip().endswith("')") and
          "console.log" in l and
          lines[i+1].strip().startswith("'===")):
        # 2-line broken pattern (no trailing ); on separate line)
        # e.g. "    console.log('\n" + "'========== ... ==========');"
        header = lines[i+1].strip()
        if header.endswith("');"):
            header = header[:-3]  # remove ');\n
        elif header.endswith("'"):
            header = header[:-1]
        # strip leading '
        if header.startswith("'"):
            header = header[1:]
        base = l.rstrip()
        if base.endswith("'"):
            base = base[:-1]
        fixed_line = base + header + "');"
        result.append(fixed_line)
        print(f'Fixed 2-line at {i+1}: {fixed_line[:60]}')
        i += 2
        fixed_count += 1
    elif (i + 1 < len(lines) and
          l.strip().endswith("'") and
          not l.strip().endswith("');") and
          lines[i+1].strip().startswith("'===")):
        # Line ends with just a quote, next is header
        header = lines[i+1].strip()
        header_content = header[1:-1] if header.startswith("'") else header
        if header_content.endswith("'"):
            header_content = header_content[:-1]
        fixed_line = l.rstrip()[:-1] + header_content + "');"
        result.append(fixed_line)
        print(f'Fixed quote-split at {i+1}: {fixed_line[:60]}')
        i += 2
        fixed_count += 1
    else:
        result.append(l)
        i += 1

new_content = '\n'.join(result) + '\n'
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Fixed {fixed_count} split log lines')
print(f'New lines: {len(result)}')
print(f'Brace: open={new_content.count("{")} close={new_content.count("}")}')

import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True, text=True, errors='replace')
err_lines = r.stderr.split('\n') if r.stderr else []
print(f'Syntax check: {err_lines[0] if err_lines else "OK"}')
print(f'Return code: {r.returncode}')

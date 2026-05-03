path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()

# Fix lines 528-529 (0-indexed 527-528): merge split console.log
# Line 527 ends with "\n" inside string, line 528 starts with Chinese header
# New content should be: console.log('\n========== 10. 包装（正常+异常） ==========');
if "    console.log('\\n'\n" in ''.join(lines[527:529]) and '========== 10.' in lines[528]:
    print('Found split at line 528-529')
    # Merge lines 528 and 529
    lines[528] = "    console.log('\\n========== 10. 包装（正常+异常） ==========');\n"
    del lines[528]  # remove the duplicate line (now at 528 after shift)
    print('Fixed split log line')

# Now find and fix all remaining split log lines
# The pattern: line ends with "\n" or just "' followed by Chinese content
# Scan for similar issues
i = 0
fixed = 0
while i < len(lines):
    l = lines[i].rstrip('\n')
    # If line ends with "' and next line starts with === (header) or non-code content
    if re.match(r"^\s*console\.log\('\\n'\s*$", l) or (l.strip().endswith("'") and not l.strip().endswith("');") and i+1 < len(lines) and lines[i+1].strip().startswith('=')):
        print(f'Found split log at line {i+1}: {repr(l[:50])} + {repr(lines[i+1][:50])}')
        # Merge with next line
        if i+1 < len(lines):
            next_line = lines[i+1].strip()
            # Extract content from next line
            # Next line could be "========== header ==========');\n" or similar
            # Find the content between quotes
            merged = l + lines[i+1]
            # Try to fix it
            # Pattern: console.log('\n' + next_content
            # Fix: console.log('\n========== ... ==========');
            # Remove the \n' from l and merge
            base = l.rstrip().replace("console.log('\\n'", "console.log('\\n")
            # Now base ends with \n, need to add the header
            # Actually base ends with console.log('\n'
            # We want console.log('\n========== ...
            # So we need to remove the trailing \n' and replace
            base_fixed = l.rstrip()[:-1]  # remove trailing '
            header = lines[i+1].rstrip()
            # Remove trailing ');\n or similar
            header_clean = re.sub(r"'\);?$", '', header)
            fixed_line = base_fixed + header_clean + "');\n"
            lines[i] = fixed_line
            del lines[i+1]
            fixed += 1
            print(f'  Fixed to: {repr(fixed_line[:80])}')
            continue
    i += 1

print(f'Total fixed: {fixed}')
new_content = ''.join(lines)
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Lines: {len(lines)}')
print(f'Brace: open={new_content.count(\"{\")} close={new_content.count(\"}\")}')

import subprocess
r = subprocess.run(['node','--check', path], capture_output=True, text=True)
err = r.stderr.split('\n')
print('Syntax:', err[0] if r.stderr else 'OK')
print('Return code:', r.returncode)

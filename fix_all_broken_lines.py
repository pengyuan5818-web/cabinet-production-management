import re

f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8-sig') as fh:
    c = fh.read()

# Find all broken lines: comment + 4+ spaces + code keyword
# Replace with: comment on own line, then code on next line
# The pattern: any line that has // followed by text and then 4+ spaces and a code keyword

# Split into lines
lines = c.split('\n')
fixed = []
fix_count = 0

for i, line in enumerate(lines):
    # Match: // comment_text    codeKeyword
    m = re.match(r'^(\s*// [^\r\n]+?)(    [a-z])', line)
    if m:
        comment_part = m.group(1)
        code_part = m.group(2).lstrip()  # remove leading spaces from code
        fixed.append(comment_part)
        fixed.append('    ' + code_part)
        fix_count += 1
    else:
        fixed.append(line)

print(f'Fixed {fix_count} broken lines')

if fix_count > 0:
    with open(f, 'w', encoding='utf-8-sig') as fh:
        fh.write('\n'.join(fixed))
    print('Written')
else:
    print('No changes')

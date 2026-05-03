import re
f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8-sig') as fh:
    c = fh.read()

# Fix: lines where comment ends and 'if (req.user.type' follows on same line
# Pattern: // comment text    if (req.user.type
c2 = re.sub(r'(\/\/ [^\r\n]{1,30})    if \(req\.user\.type', r'\1\n    if (req.user.type', c)

if c2 != c:
    with open(f, 'w', encoding='utf-8-sig') as fh:
        fh.write(c2)
    print('Fixed!')
else:
    print('No change needed')

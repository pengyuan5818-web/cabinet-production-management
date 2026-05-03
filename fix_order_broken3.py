f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'rb') as fh:
    raw = fh.read()

# The broken section: line 116 is just "    c" instead of "    const orderResult = await db.query("
# Let's find where "    c\r" appears right after a comment line
needle = b'    // \xe7\x94\xb5\xe5\x95\x86\xe4\xb8\xbb\xe4\xbf\xa1\xe6\x81\xaf\r\n    c\r'
print('needle in file:', needle in raw)

if needle in raw:
    replacement = b'    // \xe7\x94\xb5\xe5\x95\x86\xe4\xb8\xbb\xe4\xbf\xa1\xe6\x81\xaf\r\n    const orderResult = await db.query('
    # but we need to also fix the closing ) that follows on line 127
    # Actually let me take a different approach: read line by line
    pass

# Better approach: read text, split into lines, fix broken lines, write back
text = raw.decode('utf-8-sig')
lines = text.split('\n')

# Lines 115-127 (0-indexed 114-126) need to be replaced with correct code
# Line 114: "    // 订单主信息"  (already correct comment)
# Line 115: "    c"  <- broken, should be "    const orderResult = await db.query("
# Line 116: "      `SELECT o.*, "
# Lines 117-125: SQL template
# Line 126: "      [id]"
# Line 127: "    );"  <- this is fine (closes the query)

# Actually the whole block needs fixing. Let me just check what the correct block should look like
# and replace the range

# First find line 115 (0-indexed 114) which is "    c"
for i in range(110, 130):
    print(f'{i}: {repr(lines[i][:60])}')

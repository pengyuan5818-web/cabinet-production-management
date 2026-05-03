f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8-sig') as fh:
    c = fh.read()

# The broken block spans lines 115-127 (0-indexed: 114-126)
# Find and replace the broken pattern
old = '''    // 璁㈠崟涓讳俊鎭?
    c
      `SELECT o.*, 
              d.dealer_name, d.contact_person as dealer_contact, d.phone as dealer_phone,
              c.customer_name, c.phone as customer_phone, c.address as customer_address,
              dr.design_no, dr.design_file
       FROM order_master o
       LEFT JOIN dealer d ON o.dealer_id = d.id
       LEFT JOIN customer c ON o.customer_id = c.id
       LEFT JOIN design_record dr ON o.design_id = dr.id
       WHERE o.id = $1`,
      [id]
    );'''

new = '''    // 订单主信息
    const orderResult = await db.query(
      `SELECT o.*, 
              d.dealer_name, d.contact_person as dealer_contact, d.phone as dealer_phone,
              c.customer_name, c.phone as customer_phone, c.address as customer_address,
              dr.design_no, dr.design_file
       FROM order_master o
       LEFT JOIN dealer d ON o.dealer_id = d.id
       LEFT JOIN customer c ON o.customer_id = c.id
       LEFT JOIN design_record dr ON o.design_id = dr.id
       WHERE o.id = $1`,
      [id]
    );'''

if old in c:
    c = c.replace(old, new)
    with open(f, 'w', encoding='utf-8-sig') as fh:
        fh.write(c)
    print('Fixed!')
else:
    print('Not found')
    idx = c.find('// 璁㈠崟涓讳俊鎭?')
    if idx >= 0:
        print(repr(c[idx:idx+500]))

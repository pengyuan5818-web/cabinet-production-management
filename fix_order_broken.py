f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8-sig') as fh:
    c = fh.read()

# Fix the broken section around line 115
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
    print('Fixed broken section')
else:
    print('Pattern not found, trying alternate...')
    # Try to find the broken part another way
    idx = c.find('    // 璁㈠崟涓讳俊鎭?')
    if idx >= 0:
        print(f'Found at {idx}')
        print(repr(c[idx:idx+400]))
    else:
        print('Not found at all')

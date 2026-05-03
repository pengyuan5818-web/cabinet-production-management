f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Find the unique SQL line
marker = "await client.query(\n      `UPDATE order_master SET updated_at=NOW() WHERE id=$1`,\n      [id]\n    );"
idx = c.find(marker)
print('marker at:', idx)
if idx >= 0:
    # go back to find the comment before it
    chunk_start = c.rfind('//', 0, idx)
    chunk_end = idx + len(marker)
    old_block = c[chunk_start:chunk_end]
    print('old block found, length:', len(old_block))
    
    new_block = """    // 3. 不需要安装则直接完成订单，否则保持 shipped 等待安装完成
    if (order.installation_required) {
      await client.query(`UPDATE order_master SET updated_at=NOW() WHERE id=$1`, [id]);
    } else {
      await client.query(`UPDATE order_master SET order_status='completed', updated_at=NOW() WHERE id=$1`, [id]);
    }
"""
    c = c[:chunk_start] + new_block + c[chunk_end:]
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print('replaced OK')
else:
    print('marker not found')

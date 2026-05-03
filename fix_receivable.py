f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\receivable.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Find the COMMIT in the collection endpoint and add order completion logic
old = """      await client.query('COMMIT');

      res.json({
        message: '收款核销成功',
        payment_status: newStatus,
        record: recordResult.rows[0]
      });"""

new = """      await client.query('COMMIT');

      // 尾款收完 + 订单已安装完成（或无需安装）→ 订单状态改为 completed
      if (newStatus === 'paid') {
        const orderCheck = await db.query(
          `SELECT order_status, installation_required FROM order_master WHERE id = $1`,
          [ar.order_id]
        );
        if (orderCheck.rows.length > 0) {
          const ord = orderCheck.rows[0];
          // 只有安装已完成（installed）或无需安装（installation_required=false）的订单才能完成
          if (ord.installation_required === false || ord.order_status === 'installed') {
            await db.query(
              `UPDATE order_master SET order_status = 'completed', updated_at = NOW() WHERE id = $1`,
              [ar.order_id]
            );
          }
        }
      }

      res.json({
        message: '收款核销成功',
        payment_status: newStatus,
        record: recordResult.rows[0]
      });"""

if old in c:
    c = c.replace(old, new)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print('done')
else:
    print('not found')
    idx = c.find("await client.query('COMMIT')")
    print('COMMIT at:', idx)

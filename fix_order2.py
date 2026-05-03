f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Fix: tracking insert should only happen when installation_required
old = """        // 4. 记录追踪
    await client.query(
      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, stage_remark, created_at)
       VALUES ($1,'installation','涓婇棬瀹夎€咃紝'pending'锛岀墿娴佸凡绛炬敹锛岀瓑寰呭畨瑁呭笀鎷呭綍',NOW())`,
      [id]
    );"""

new = """    // 4. 如果需要安装，记录追踪
    if (order.installation_required) {
      await client.query(
        `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, stage_remark, created_at)
         VALUES ($1,'installation','涓婇棬瀹夎€咃紝'pending'锛岀墿娴佸凡绛炬敹锛岀瓑寰呭畨瑁呭笀鎷呭綍',NOW())`,
        [id]
      );
    }"""

if old in c:
    c = c.replace(old, new)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print('done')
else:
    print('not found')
    idx = c.find("4. 璁板綍杩借釜")
    print('search result:', idx)
    if idx > 0:
        print(repr(c[idx:idx+300]))

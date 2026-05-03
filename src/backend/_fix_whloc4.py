path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
content = open(path, encoding='utf-8').read()

fn_start = content.find("router.post('/finished-locations'")
fn_end = content.find("router.delete('/finished-locations'")

if fn_start < 0 or fn_end < 0:
    print(f'ERROR: start={fn_start}, end={fn_end}')
    exit(1)

new_fn = r"""router.post('/finished-locations', async (req, res, next) => {
  try {
    const { location_code, location_name } = req.body;
    if (!location_code) return res.status(400).json({ success: false, message: '库位编码不能为空' });
    // 从编码前缀提取区域，如 B-2 → 区域 B
    const zoneMatch = location_code.match(/^([A-Z]+)/);
    const zone = zoneMatch ? zoneMatch[1] + '\u533A' : '\u4E00\u533A';
    const wh = await db.query(`SELECT id FROM warehouse WHERE warehouse_type = 'finished' LIMIT 1`);
    if (wh.rows.length === 0) return res.status(404).json({ success: false, message: '未找到成品仓库' });
    const finishedWhId = wh.rows[0].id;
    const exist = await db.query(
      `SELECT id FROM warehouse_location WHERE warehouse_id = $1 AND location_code = $2`,
      [finishedWhId, location_code]
    );
    if (exist.rows.length > 0) return res.status(400).json({ success: false, message: '库位编码已存在' });
    const displayName = location_name || ('\u533A\u57DF' + location_code.replace('-', '-\u5E93\u4F4D'));
    const result = await db.query(
      `INSERT INTO warehouse_location (id, warehouse_id, location_code, location_name, zone, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [uuidv4(), finishedWhId, location_code, displayName, zone, 'empty']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});
"""

new_content = content[:fn_start] + new_fn + content[fn_end:]
open(path, 'w', encoding='utf-8').write(new_content)
print(f'Done. Replaced {fn_end - fn_start} chars with {len(new_fn)} chars. Total: {len(new_content)}')

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
content = open(path, encoding='utf-8').read()

old_fn = """router.post('/finished-locations', async (req, res, next) => {
  try {
    const { location_name } = req.body;
    if (!location_name) return res.status(400).json({ success: false, message: '库位名称不能为空' });
    const wh = await db.query(`SELECT id FROM warehouse WHERE warehouse_type = 'finished' LIMIT 1`);
    if (wh.rows.length === 0) return res.status(404).json({ success: false, message: '未找到成品仓库' });
    const finishedWhId = wh.rows[0].id;
    const maxResult = await db.query(`SELECT MAX(location_code::int) as max_code FROM warehouse_location WHERE warehouse_id = $1`, [finishedWhId]);
    const nextCode = (maxResult.rows[0].max_code || 0) + 1;
    const result = await db.query(
      \`INSERT INTO warehouse_location (id, warehouse_id, location_code, location_name, zone, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *\`,
      [uuidv4(), finishedWhId, String(nextCode), location_name, 'A区', 'empty']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});"""

new_fn = """router.post('/finished-locations', async (req, res, next) => {
  try {
    const { location_code, location_name } = req.body;
    if (!location_code) return res.status(400).json({ success: false, message: '库位编码不能为空' });
    // 从编码前缀提取区域，如 B-2 → 区域 B
    const zoneMatch = location_code.match(/^([A-Z]+)/);
    const zone = zoneMatch ? zoneMatch[1] + '区' : 'A区';
    const wh = await db.query(`SELECT id FROM warehouse WHERE warehouse_type = 'finished' LIMIT 1`);
    if (wh.rows.length === 0) return res.status(404).json({ success: false, message: '未找到成品仓库' });
    const finishedWhId = wh.rows[0].id;
    // 检查编码是否已存在
    const exist = await db.query(
      `SELECT id FROM warehouse_location WHERE warehouse_id = $1 AND location_code = $2`,
      [finishedWhId, location_code]
    );
    if (exist.rows.length > 0) return res.status(400).json({ success: false, message: '库位编码已存在' });
    const displayName = location_name || ('区域' + location_code.replace('-', '-库位'));
    const result = await db.query(
      \`INSERT INTO warehouse_location (id, warehouse_id, location_code, location_name, zone, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *\`,
      [uuidv4(), finishedWhId, location_code, displayName, zone, 'empty']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});"""

if old_fn in content:
    content = content.replace(old_fn, new_fn)
    print('Fixed: finished-locations POST')
else:
    print('WARNING: old function not found')
    idx = content.find("router.post('/finished-locations'")
    if idx >= 0:
        print('Found at idx', idx)
        print(repr(content[idx:idx+600]))

open(path, 'w', encoding='utf-8').write(content)

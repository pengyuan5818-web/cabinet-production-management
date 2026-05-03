filepath = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')
print(f'Line 621: {repr(lines[620])}')
print(f'Line 622: {repr(lines[621])}')
print(f'Line 623: {repr(lines[622][:80])}')

# Keep lines 1-622 (up to and including the "// ============ 库存统计 ============" comment)
kept = lines[:622]
print(f'\nKeeping {len(kept)} lines, last: {repr(kept[-1][:60])}')

remaining = """

router.get('/summary', async (req, res, next) => {
  try {
    const total = await db.query("SELECT COUNT(DISTINCT m.id) as material_types, SUM(COALESCE(si.quantity, 0)) as total_quantity, SUM(COALESCE(si.quantity, 0) * COALESCE(m.unit_price, 0)) as total_value FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.status = 'active'");
    const cat = await db.query("SELECT m.category, COUNT(DISTINCT m.id) as material_types, SUM(COALESCE(si.quantity, 0)) as total_quantity FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.status = 'active' GROUP BY m.category ORDER BY m.category");
    const alert = await db.query("SELECT COUNT(*) as alert_count FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.status = 'active' AND COALESCE(si.quantity, 0) <= m.safe_stock");
    const todayIn = await db.query("SELECT COALESCE(SUM(sid.quantity), 0) as today_in FROM stock_in_detail sid JOIN stock_in si ON sid.stock_in_id = si.id WHERE si.created_at >= CURRENT_DATE");
    const todayOut = await db.query("SELECT COALESCE(SUM(sod.quantity), 0) as today_out FROM stock_out_detail sod JOIN stock_out so ON sod.stock_out_id = so.id WHERE so.created_at >= CURRENT_DATE");
    const boards = await db.query("SELECT COUNT(*) as total_boards FROM cabinet_board");
    res.json({ success: true, data: {
      total_materials: parseInt(total.rows[0].material_types || 0),
      total_quantity: parseFloat(total.rows[0].total_quantity || 0),
      total_value: parseFloat(total.rows[0].total_value || 0),
      by_category: cat.rows,
      alert_count: parseInt(alert.rows[0].alert_count || 0),
      today_in: parseFloat(todayIn.rows[0].today_in || 0),
      today_out: parseFloat(todayOut.rows[0].today_out || 0),
      total_boards: parseInt(boards.rows[0].total_boards || 0)
    }});
  } catch (err) { next(err); }
});

module.exports = router;
"""

full = ''.join(kept) + remaining
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(full)

print(f'Written {len(full)} bytes, {len(full.splitlines())} lines')

# Verify
with open(filepath, 'r', encoding='utf-8') as f:
    check = f.read()
print(f'Verified: {len(check)} bytes')
print('Last 5 lines:', check.splitlines()[-5:])

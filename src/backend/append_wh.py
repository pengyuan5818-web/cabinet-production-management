import os

p = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'

# Read existing file
with open(p, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the last complete line and truncate there
lines = content.split('\n')
print(f'Total lines: {len(lines)}')
print(f'Last line: {repr(lines[-1])}')

# Remove the incomplete last line (should be "WHERE m")
if lines[-1].strip() == 'WHERE m' or lines[-1].strip() == '':
    lines = lines[:-1]
    print('Removed incomplete trailing line')

# Append the rest
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

full = '\n'.join(lines) + remaining

with open(p, 'w', encoding='utf-8') as f:
    f.write(full)

print(f'Written {len(full)} bytes, {len(full.splitlines())} lines')
print('Last 3 lines:', full.splitlines()[-3:])

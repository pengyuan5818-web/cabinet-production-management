const path = require('path');
process.chdir(path.join(__dirname, 'src'));
const db = require('./src/db');

async function run() {
  // 模拟 GET /api/orders/:id 的板件查询逻辑（修复后的版本）
  const orderId = '880e4da3-0001-0001-0001-000000000001';

  const boardResult = await db.query(
    `SELECT id, board_no, cabinet_no, cabinet_name, board_name, board_type,
            material, color, length, width, thickness, quantity,
            status, current_location, barcode, created_at
     FROM cabinet_board WHERE order_id = $1 ORDER BY created_at`,
    [orderId]
  );

  const boardStats = await db.query(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as scanned
     FROM cabinet_board WHERE order_id = $1`,
    [orderId]
  );

  const boards = {
    total: parseInt(boardStats.rows[0].total),
    pending: parseInt(boardStats.rows[0].pending),
    scanned: parseInt(boardStats.rows[0].scanned),
    list: boardResult.rows
  };

  console.log('N3 修复验证 - 订单 F20260420001 板件数据:');
  console.log('  总数:', boards.total);
  console.log('  待加工:', boards.pending);
  console.log('  已扫描:', boards.scanned);
  console.log('  板件列表:');
  boards.list.forEach(b => {
    console.log('   -', b.board_no, '|', b.board_name, '|', b.status, '|', b.current_location);
  });

  // 验证字段完整性
  const sample = boardResult.rows[0];
  console.log('\n板件字段完整性:');
  console.log('  id:', !!sample.id);
  console.log('  board_no:', !!sample.board_no);
  console.log('  cabinet_no:', !!sample.cabinet_no);
  console.log('  cabinet_name:', !!sample.cabinet_name);
  console.log('  board_name:', !!sample.board_name);
  console.log('  status:', !!sample.status);
  console.log('  current_location:', !!sample.current_location);
  console.log('  barcode:', !!sample.barcode);

  process.exit(0);
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

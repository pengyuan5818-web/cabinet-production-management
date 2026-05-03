const path = require('path');
process.chdir(path.join(__dirname, 'src'));
const db = require('./src/db');

async function run() {
  // 找draft订单
  const draft = await db.query(`SELECT id, order_no, order_status FROM order_master WHERE order_status = 'draft'`);
  console.log('draft订单:', draft.rows);

  if (draft.rows.length > 0) {
    // 检查状态机允许的转换
    const transitions = {
      'draft': ['pending', 'producing'],
      'pending': ['producing', 'cancelled'],
      'producing': ['shipped', 'cancelled'],
      'shipped': ['installed'],
      'installed': ['completed'],
    };
    console.log('draft允许转换:', transitions['draft']);
    console.log('producing是否在允许列表:', transitions['draft'].includes('producing') ? '✓ 是' : '✗ 否');
  }

  // 检查佣金结算触发（订单完成时）
  const settledComm = await db.query(`SELECT * FROM dealer_commission WHERE status = 'settled'`);
  console.log('\n已结算佣金:', settledComm.rows.length, '条');

  // 检查BOM是否关联物料
  const bom = await db.query(`SELECT ob.order_id, ob.material_code, ob.material_name, m.id as material_id FROM order_bom ob LEFT JOIN material m ON ob.material_code = m.material_code LIMIT 3`);
  console.log('\nBOM关联物料检查:');
  bom.rows.forEach(r => console.log(' ', r.order_id?.slice(0,8), r.material_code, '-> 物料ID:', r.material_id ? '✓' : '✗ 无'));

  // 检查板件关联订单
  const boardOrders = await db.query(`SELECT cb.board_no, cb.order_id, om.order_no FROM cabinet_board cb LEFT JOIN order_master om ON cb.order_id = om.id LIMIT 3`);
  console.log('\n板件→订单检查:');
  boardOrders.rows.forEach(r => console.log(' ', r.board_no, '->', r.order_no || '✗ 无关联'));

  process.exit(0);
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

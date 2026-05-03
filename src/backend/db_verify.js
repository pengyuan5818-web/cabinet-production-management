const path = require('path');
process.chdir(path.join(__dirname, 'src'));
const db = require('./src/db');

async function run() {
  console.log('=== 数据库直接验证 ===\n');

  const orders = await db.query(`SELECT order_no, total_amount, deposit_amount, order_status, dealer_id, customer_id FROM order_master ORDER BY created_at`);
  console.log('订单:');
  orders.rows.forEach(r => console.log(' ', r.order_no, '¥' + r.total_amount, r.order_status, '| dealer:', r.dealer_id?.slice(0,8), '| customer:', r.customer_id?.slice(0,8)));

  const dealers = await db.query(`SELECT dealer_code, dealer_name, commission_rate FROM dealer`);
  console.log('\n经销商:');
  dealers.rows.forEach(r => console.log(' ', r.dealer_code, r.dealer_name, '佣金率:' + r.commission_rate));

  const commissions = await db.query(`SELECT commission_no, order_amount, commission_rate, commission_amount, status FROM dealer_commission`);
  console.log('\n佣金:');
  commissions.rows.forEach(r => console.log(' ', r.commission_no, '¥' + r.order_amount + 'x' + r.commission_rate + '=' + r.commission_amount, r.status));

  const stages = await db.query(`SELECT stage, stage_name, estimated_hours, daily_capacity FROM production_stage ORDER BY stage_order`);
  console.log('\n生产阶段:');
  stages.rows.forEach(r => console.log(' ', r.stage, r.stage_name, '预估' + r.estimated_hours + 'h', '产能' + r.daily_capacity));

  const costSummary = await db.query(`SELECT order_no, material_cost, labor_cost, manufacturing_overhead, total_cost, order_amount, gross_profit, gross_margin FROM order_cost_summary`);
  console.log('\n成本汇总:');
  costSummary.rows.forEach(r => console.log(' ', r.order_no, '| 材料¥' + r.material_cost, '人工¥' + r.labor_cost, '制造费¥' + r.manufacturing_overhead, '| 总成本¥' + r.total_cost, '| 订单¥' + r.order_amount, '| 毛利¥' + r.gross_profit + '(' + Math.round(r.gross_margin*100) + '%)'));

  const ar = await db.query(`SELECT customer_name, total_amount, paid_amount, balance_amount, payment_status FROM accounts_receivable`);
  console.log('\n应收款:');
  ar.rows.forEach(r => console.log(' ', r.customer_name, '总¥' + r.total_amount, '已付¥' + r.paid_amount, '欠¥' + r.balance_amount, r.payment_status));

  const boards = await db.query(`SELECT board_no, board_name, status, current_location FROM cabinet_board ORDER BY created_at`);
  console.log('\n板件:');
  boards.rows.forEach(r => console.log(' ', r.board_no, r.board_name, r.status, r.current_location));

  await db.end();
  process.exit(0);
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

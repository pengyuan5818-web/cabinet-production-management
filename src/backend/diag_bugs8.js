process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  const tables = ['production_calendar', 'order_tracking', 'material_bom'];
  for (const t of tables) {
    try {
      const cols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [t]);
      console.log(`${t}:`, cols.rows.map(r=>r.column_name).join(', '));
    } catch(e) { console.log(`${t}: 不存在 (${e.code})`); }
  }

  // 测试 enqueue 是否会失败（order_master 没有 schedule_status）
  console.log('\n=== Bug#6 核心: 测试 order_master 无 schedule_status ===');
  // enqueue 执行: UPDATE order_master SET schedule_status='unscheduled' WHERE id=$1
  // 这会报错: 字段 schedule_status 不存在
  try {
    // 先找一个真实订单ID
    const order = await db.query('SELECT id FROM order_master LIMIT 1');
    const orderId = order.rows[0].id;
    console.log('订单ID:', orderId);
    const r = await db.query('UPDATE order_master SET schedule_status=$1 WHERE id=$2 RETURNING id', ['unscheduled', orderId]);
    console.log('schedule_status 更新成功（字段存在）');
  } catch(e) {
    console.log('❌ schedule_status 更新失败:', e.message.split('\n')[0]);
  }

  // 测试 priority 字段
  console.log('\n=== Bug#6 核心: 测试 order_master 无 priority ===');
  try {
    const r = await db.query('SELECT priority FROM order_master LIMIT 1');
    console.log('priority 查询成功（字段存在）');
  } catch(e) {
    console.log('❌ priority 查询失败:', e.message.split('\n')[0]);
  }

  // 测试 estimated_hours 字段
  console.log('\n=== Bug#6: 测试 order_master 无 estimated_hours ===');
  try {
    const r = await db.query('SELECT estimated_hours FROM order_master LIMIT 1');
    console.log('estimated_hours 查询成功（字段存在）');
  } catch(e) {
    console.log('❌ estimated_hours 查询失败:', e.message.split('\n')[0]);
  }

  // 测试 generateSchedule 实际报错
  console.log('\n=== Bug#6: generateSchedule 实际报错 ===');
  try {
    const sched = require('./src/services/schedulingService');
    const r = await sched.generateSchedule();
    console.log('generateSchedule 结果:', JSON.stringify(r));
  } catch(e) {
    console.log('❌ generateSchedule 异常:', e.message.split('\n')[0]);
  }

  // 检查 dealer_commission 表 vs dealer_commission_settlement
  console.log('\n=== Bug#1: 佣金结算表检查 ===');
  try {
    const dc = await db.query('SELECT id, status, settled_amount FROM dealer_commission LIMIT 3');
    console.log('dealer_commission 数据:', JSON.stringify(dc.rows));
  } catch(e) { console.log('dealer_commission 不存在:', e.code); }

  process.exit(0);
}
main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });

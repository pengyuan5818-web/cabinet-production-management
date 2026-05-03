process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  console.log('=== 关键表结构检查 ===');

  // order_master 完整字段
  const om = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['order_master']);
  console.log('\norder_master 字段:');
  om.rows.forEach(r => console.log(' ', r.column_name));

  // dealer_commission 表
  try {
    const dc = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['dealer_commission']);
    console.log('\ndealer_commission 字段:');
    dc.rows.forEach(r => console.log(' ', r.column_name));
  } catch(e) { console.log('\ndealer_commission 不存在:', e.code); }

  // webhook 表
  try {
    const wh = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['webhook']);
    console.log('\nwebhook 字段:');
    wh.rows.forEach(r => console.log(' ', r.column_name));
  } catch(e) { console.log('\nwebhook 不存在:', e.code); }

  // dealer_api 表
  try {
    const da = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['dealer_api']);
    console.log('\ndealer_api 字段:');
    da.rows.forEach(r => console.log(' ', r.column_name));
  } catch(e) { console.log('\ndealer_api 不存在:', e.code); }

  // 检查 schedulingService 依赖的 schedule_status 字段
  console.log('\n=== order_master 是否有 schedule_status ===');
  const hasSS = om.rows.find(r => r.column_name === 'schedule_status');
  console.log('schedule_status 字段:', hasSS ? '✅ 存在' : '❌ 不存在');

  // 检查 estimated_hours 字段
  const hasEH = om.rows.find(r => r.column_name === 'estimated_hours');
  console.log('estimated_hours 字段:', hasEH ? '✅ 存在' : '❌ 不存在');

  // 检查现有订单是否有 priority 信息（在别的表？）
  console.log('\n=== 现有订单 priority 数据来源？ ===');
  const orderData = await db.query('SELECT id, order_no, order_status, expected_delivery FROM order_master LIMIT 3');
  console.log('订单数据:', JSON.stringify(orderData.rows, null, 2));

  // 检查 production_schedule 表结构
  try {
    const ps = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['production_schedule']);
    console.log('\nproduction_schedule 字段:');
    ps.rows.forEach(r => console.log(' ', r.column_name));
  } catch(e) { console.log('\nproduction_schedule 不存在'); }

  process.exit(0);
}
main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });

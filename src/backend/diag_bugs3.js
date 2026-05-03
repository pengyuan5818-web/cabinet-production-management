process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  console.log('=== Bug#6: 检查 production_stage 表 ===');
  const stageCols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['production_stage']);
  console.log('production_stage 字段:', stageCols.rows.map(c=>c.column_name).join(', '));

  console.log('\n=== Bug#1: order_cost_summary ===');
  try { await db.query('SELECT 1 FROM order_cost_summary LIMIT 1'); console.log('存在'); }
  catch(e) { console.log('不存在:', e.code, e.message.split('\n')[0]); }

  console.log('\n=== Bug#6 深入: schedulingService 如何使用 priority ===');
  const fs = require('fs');
  const sched = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/schedulingService.js', 'utf8');
  const lines = sched.split('\n');
  lines.forEach((l,i) => { if(l.includes('priority')) console.log(`  line ${i+1}: ${l.trim()}`); });

  console.log('\n=== Bug#1 深入: cost_report/detail ===');
  const cost = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/cost.js', 'utf8');
  const costLines = cost.split('\n');
  costLines.forEach((l,i) => { if(l.includes('order_cost_summary')||l.includes('cost_record')||l.includes('material_bom')) console.log(`  line ${i+1}: ${l.trim()}`); });

  console.log('\n=== Bug#6: 测试正确的排程端点 ===');
  // 检查 production_schedule 表是否存在
  try { await db.query('SELECT 1 FROM production_schedule LIMIT 1'); console.log('production_schedule 存在'); }
  catch(e) { console.log('production_schedule 不存在:', e.code); }

  // 检查 schedulingService 依赖的表
  const deps = ['production_schedule', 'order_master'];
  for (const t of deps) {
    const c = await db.query('SELECT COUNT(*) as cnt FROM ' + t);
    console.log(`${t}: ${c.rows[0].cnt} 行`);
  }

  process.exit(0);
}
main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });

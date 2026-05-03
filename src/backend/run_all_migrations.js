/**
 * 执行所有待执行迁移
 * 依次执行: 005 → 006 → 007 → 008
 */
const path = require('path');
process.chdir(__dirname);

const db = require('./src/db');

async function runMigration(name, migration) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`执行迁移: ${name}`);
  console.log('='.repeat(50));
  try {
    const result = migration.up();
    if (result && typeof result.then === 'function') {
      await result;
    }
    console.log(`✅ ${name} 完成`);
    return true;
  } catch (err) {
    console.error(`❌ ${name} 失败:`, err.message);
    return false;
  }
}

async function main() {
  const migrations = [
    { name: '005_dealer_api_webhook', file: require('./src/migrations/005_dealer_api_webhook') },
    { name: '006_commission', file: require('./src/migrations/006_commission') },
    { name: '007_scheduling', file: require('./src/migrations/007_scheduling') },
    { name: '008_cost_accounting', file: require('./src/migrations/008_cost_accounting') },
  ];

  let allSuccess = true;
  for (const m of migrations) {
    const ok = await runMigration(m.name, m.file);
    if (!ok) allSuccess = false;
  }

  // 验证关键表和字段
  console.log('\n' + '='.repeat(50));
  console.log('验证关键结构');
  console.log('='.repeat(50));

  const checks = [
    { name: 'order_master.priority', sql: "SELECT column_name FROM information_schema.columns WHERE table_name='order_master' AND column_name='priority'" },
    { name: 'order_master.schedule_status', sql: "SELECT column_name FROM information_schema.columns WHERE table_name='order_master' AND column_name='schedule_status'" },
    { name: 'order_master.estimated_hours', sql: "SELECT column_name FROM information_schema.columns WHERE table_name='order_master' AND column_name='estimated_hours'" },
    { name: 'production_schedule', sql: "SELECT table_name FROM information_schema.tables WHERE table_name='production_schedule'" },
    { name: 'production_calendar', sql: "SELECT table_name FROM information_schema.tables WHERE table_name='production_calendar'" },
    { name: 'order_cost_summary', sql: "SELECT table_name FROM information_schema.tables WHERE table_name='order_cost_summary'" },
    { name: 'work_hours_record', sql: "SELECT table_name FROM information_schema.tables WHERE table_name='work_hours_record'" },
    { name: 'cost_allocation_pool', sql: "SELECT table_name FROM information_schema.tables WHERE table_name='cost_allocation_pool'" },
  ];

  for (const c of checks) {
    try {
      const r = await db.query(c.sql);
      console.log(`${r.rows.length > 0 ? '✅' : '❌'} ${c.name}`);
    } catch(e) {
      console.log(`❌ ${c.name}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n' + (allSuccess ? '✅ 所有迁移完成' : '⚠ 部分迁移失败，请检查上面的错误'));
  process.exit(allSuccess ? 0 : 1);
}

main();

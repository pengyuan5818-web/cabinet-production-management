process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  console.log('=== Bug#1: ALTER TABLE order_master ===');
  const cols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['order_master']);
  const existing = cols.rows.map(r => r.column_name);
  console.log('现有字段:', existing.join(', '));

  const toAdd = [
    ['priority',    'VARCHAR(20) DEFAULT \'normal\''],
    ['schedule_status', 'VARCHAR(20) DEFAULT \'unscheduled\''],
    ['estimated_hours', 'NUMERIC(10,2)'],
  ];
  for (const [col, type] of toAdd) {
    if (!existing.includes(col)) {
      try {
        await db.query('ALTER TABLE order_master ADD COLUMN ' + col + ' ' + type);
        console.log('ADD ' + col + ': OK');
      } catch(e) { console.log('ADD ' + col + ': FAIL ' + e.code); }
    } else {
      console.log('SKIP ' + col + ': already exists');
    }
  }

  console.log('\n=== Bug#2: order_cost_summary 表 ===');
  try {
    await db.query('SELECT 1 FROM order_cost_summary LIMIT 1');
    console.log('order_cost_summary: EXISTS');
  } catch(e) {
    console.log('order_cost_summary: MISSING - ' + e.code);
    // 执行迁移 008
    try {
      const mig = require('./src/migrations/008_cost_accounting.js');
      await mig.up(db.query.bind(db));
      console.log('迁移 008 执行: OK');
    } catch(e2) {
      if (e2.message && e2.message.includes('already exists')) {
        console.log('迁移 008: 部分表已存在，跳过');
      } else {
        console.log('迁移 008 执行失败:', e2.message.split('\n')[0]);
      }
    }
  }

  console.log('\n=== Bug#3: production_calendar ===');
  try {
    const calCols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['production_calendar']);
    console.log('production_calendar 字段数:', calCols.rows.length);
    if (calCols.rows.length === 0) {
      console.log('production_calendar 无字段，需要初始化');
    }
  } catch(e) { console.log('production_calendar:', e.code); }

  console.log('\n=== 验证 order_master 新字段 ===');
  const cols2 = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['order_master']);
  const now2 = cols2.rows.map(r => r.column_name);
  ['priority', 'schedule_status', 'estimated_hours'].forEach(c => {
    console.log(c + ':', now2.includes(c) ? 'EXISTS' : 'MISSING');
  });

  process.exit(0);
}
main().catch(function(e) { console.error(e.message.split('\n')[0]); process.exit(1); });

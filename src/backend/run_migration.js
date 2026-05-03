const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: '192.168.3.108',
  port: 5432,
  database: 'cabinet',
  user: 'postgres',
  password: 'BOSSli'
});

async function run() {
  const sql = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/migrations/sql/fix_N2_dealer_commission_rate.sql', 'utf8');
  const statements = sql.split(/;\s*$/m).filter(s => s.trim());

  await client.connect();
  console.log('✓ 数据库连接成功');

  let success = 0, failed = 0;
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    try {
      await client.query(stmt + ';');
      const match = stmt.match(/--\s*(.+)/);
      console.log('  ✓', match ? match[1].trim() : '执行');
      success++;
    } catch(e) {
      console.log('  ⚠', e.message.split('\n')[0]);
      failed++;
    }
  }

  // 验证
  try {
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='dealer' AND column_name='commission_rate'");
    console.log('\n验证 dealer.commission_rate:', r.rows.length > 0 ? '✓ 已存在' : '✗ 不存在');
  } catch(e) {
    console.log('\n验证失败:', e.message);
  }

  // 验证 dealer_commission_settlement 表
  try {
    const r2 = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name='dealer_commission_settlement'");
    console.log('验证 dealer_commission_settlement:', r2.rows.length > 0 ? '✓ 已存在' : '✗ 不存在');
  } catch(e) {}

  // 验证 production_stage 字段
  try {
    const r3 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='production_stage' AND column_name='estimated_hours'");
    console.log('验证 production_stage.estimated_hours:', r3.rows.length > 0 ? '✓ 已存在' : '✗ 不存在');
  } catch(e) {}

  console.log('\n完成！成功' + success + '条，失败' + failed + '条');
  await client.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

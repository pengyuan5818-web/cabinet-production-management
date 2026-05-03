/**
 * 通过后端 import 执行迁移（利用后端已有的DB连接）
 * 运行方式: node run_migration_via_backend.js
 */
const path = require('path');
const fs = require('fs');

// 模拟后端的模块加载环境
process.chdir(path.join(__dirname, 'src'));

// 加载后端的db模块（使用后端的数据库配置）
const db = require('./src/db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations/sql/fix_N2_dealer_commission_rate.sql'), 'utf8');
  // 分割语句（跳过 -- 开头的注释和空语句）
  const lines = sql.split('\n');
  const statements = [];
  let current = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue; // 跳过注释
    current.push(line);
    if (trimmed.endsWith(';')) {
      const stmt = current.join('\n').trim();
      if (stmt.length > 1) statements.push(stmt);
      current = [];
    }
  }

  console.log('✓ 后端DB模块加载成功');
  console.log('开始执行迁移，共' + statements.length + '条SQL...\n');

  let success = 0, failed = 0;
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    try {
      await db.query(stmt);
      const desc = stmt.match(/--\s*(.+)/);
      console.log('  ✓', desc ? desc[1].trim() : '执行成功');
      success++;
    } catch(e) {
      const msg = e.message.split('\n')[0];
      // 忽略 "already exists" 类错误
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
        console.log('  ⚠ (已存在跳过)', msg.slice(0, 60));
      } else {
        console.log('  ⚠', msg.slice(0, 80));
        failed++;
      }
    }
  }

  // 验证
  console.log('\n=== 验证结果 ===');
  try {
    const r1 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='dealer' AND column_name='commission_rate'");
    console.log('dealer.commission_rate:', r1.rows.length > 0 ? '✅ 已存在' : '❌ 不存在');
  } catch(e) { console.log('dealer.commission_rate: ❌ 查询失败'); }

  try {
    const r2 = await db.query("SELECT table_name FROM information_schema.tables WHERE table_name='dealer_commission_settlement'");
    console.log('dealer_commission_settlement 表:', r2.rows.length > 0 ? '✅ 已存在' : '❌ 不存在');
  } catch(e) {}

  try {
    const r3 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='production_stage' AND column_name='estimated_hours'");
    console.log('production_stage.estimated_hours:', r3.rows.length > 0 ? '✅ 已存在' : '❌ 不存在');
  } catch(e) {}

  try {
    const r4 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='production_stage' AND column_name='daily_capacity'");
    console.log('production_stage.daily_capacity:', r4.rows.length > 0 ? '✅ 已存在' : '❌ 不存在');
  } catch(e) {}

  console.log('\n完成！成功' + success + '条，失败' + failed + '条（已存在跳过不算失败）');
  process.exit(0);
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

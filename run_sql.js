const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'cabinet_factory',
  user: 'postgres',
  password: 'postgres',
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node run_sql.js <sql_file>');
    process.exit(1);
  }
  const sql = fs.readFileSync(path.resolve(sqlFile), 'utf-8');
  await client.connect();
  console.log('Connected to PostgreSQL');
  
  // 分段执行（每条语句单独执行）
  const statements = sql
    .replace(/^--.*$/mg, '')  // 移除注释
    .split(/\n\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s.length > 10);

  let success = 0, failed = 0;
  for (const stmt of statements) {
    if (stmt.toUpperCase().startsWith('BEGIN')) continue; // BEGIN单独处理
    if (stmt.toUpperCase().startsWith('COMMIT')) {
      try { await client.query('COMMIT'); console.log('[COMMIT]'); } catch(e) {}
      continue;
    }
    try {
      await client.query(stmt);
      console.log('[OK]', stmt.substring(0, 80));
      success++;
    } catch (e) {
      // 忽略 "already exists" 错误
      if (!e.message.includes('already exists') && !e.message.includes('duplicate') && !e.message.includes('already been')) {
        console.error('[ERR]', e.message.substring(0, 200));
        failed++;
      } else {
        console.log('[SKIP]', e.message.substring(0, 80));
      }
    }
  }
  console.log(`\nDone: ${success} ok, ${failed} errors`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

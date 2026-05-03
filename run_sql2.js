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
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 15000
});

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node run_sql2.js <sql_file>');
    process.exit(1);
  }
  const fullSql = fs.readFileSync(path.resolve(sqlFile), 'utf-8');
  await client.connect();
  console.log('Connected to PostgreSQL');

  // 移除单行注释，分割语句
  const noComments = fullSql.replace(/^--.*$/mg, '');
  
  // 用 semicolon 分割，但注意 DO$$...$$ 和 E'...' 内嵌的分号
  // 简单策略：按行读取，累积到分号结束
  const lines = noComments.split('\n');
  const statements = [];
  let current = '';

  for (const line of lines) {
    current += line + '\n';
    // 检查是否到达语句结尾（行尾有分号且不在 $$ 或 E' 内）
    const t = current.trim();
    if (t.endsWith(';') && !t.includes('$$') && !t.includes("E'")) {
      statements.push(current.trim());
      current = '';
    } else if (t.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  let success = 0, failed = 0, skipped = 0;
  for (const stmt of statements) {
    if (!stmt || stmt.length < 5) continue;
    try {
      await client.query(stmt);
      console.log('[OK]', stmt.substring(0, 100));
      success++;
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate') || 
          msg.includes('already dropped') || msg.includes('does not exist') ||
          msg.includes('ADD COLUMN IF NOT EXISTS') || msg.includes('column') && msg.includes('not exist')) {
        console.log('[SKIP]', msg.substring(0, 100));
        skipped++;
      } else {
        console.error('[ERR]', msg.substring(0, 200));
        failed++;
      }
    }
  }

  console.log(`\nResult: ${success} ok, ${skipped} skipped, ${failed} errors`);
  await client.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });

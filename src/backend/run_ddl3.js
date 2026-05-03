const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cabinet_factory',
    user: 'postgres',
    password: 'postgres'
  });

  await client.connect();
  console.log('Connected to database');

  // Check which tables already exist
  const result = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const existing = new Set(result.rows.map(r => r.table_name));
  console.log('Existing tables:', existing.size);

  const sql = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/scripts/add_missing_tables.sql', 'utf8');
  
  // Remove comments and find all CREATE TABLE statements
  const createMatches = sql.match(/CREATE TABLE IF NOT EXISTS \w+[\s\S]*?;/g);
  
  if (!createMatches) {
    console.log('No CREATE TABLE statements found');
    await client.end();
    return;
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const stmt of createMatches) {
    const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (!tableMatch) continue;
    const tableName = tableMatch[1];

    if (existing.has(tableName)) {
      console.log('  - ' + tableName + ' (already exists)');
      skipped++;
      continue;
    }
    
    try {
      await client.query(stmt);
      success++;
      console.log('  + ' + tableName);
    } catch (err) {
      failed++;
      errors.push({ table: tableName, error: err.message });
      console.log('  ✗ ' + tableName + ': ' + err.message.substring(0, 150));
    }
  }

  console.log('\n=== Result ===');
  console.log('Success: ' + success);
  console.log('Skipped (exist): ' + skipped);
  console.log('Failed: ' + failed);
  
  if (errors.length > 0) {
    console.log('\nFailed tables:');
    errors.forEach(e => console.log('  ' + e.table + ':\n    ' + e.error.substring(0, 200)));
  }

  // Final count
  const finalResult = await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'");
  console.log('\nTotal tables after: ' + finalResult.rows[0].count);

  await client.end();
}

main().catch(console.error);

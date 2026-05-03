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

  const sql = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/scripts/add_missing_tables.sql', 'utf8');
  
  // Remove comments and split by CREATE TABLE
  const lines = sql.split('\n');
  const cleanedLines = lines.map(line => {
    const idx = line.indexOf('--');
    return idx >= 0 ? line.substring(0, idx) : line;
  });
  const cleanedSql = cleanedLines.join('\n');
  
  // Split by CREATE TABLE
  const parts = cleanedSql.split(/CREATE TABLE IF NOT EXISTS /);
  
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const nlIdx = part.indexOf('\n');
    const tableName = part.substring(0, nlIdx).trim();
    const rest = part.substring(nlIdx + 1);
    
    // Find the closing semicolon
    let endIdx = rest.lastIndexOf(';');
    if (endIdx < 0) {
      console.log('  ! ' + tableName + ': no semicolon found');
      continue;
    }
    
    const stmt = 'CREATE TABLE IF NOT EXISTS ' + part.substring(0, nlIdx + 1 + endIdx + 1).trim();
    
    try {
      await client.query(stmt);
      success++;
      console.log('  + ' + tableName);
    } catch (err) {
      failed++;
      errors.push({ table: tableName, error: err.message });
      console.log('  ✗ ' + tableName + ': ' + err.message.substring(0, 120));
    }
  }

  console.log('\n=== Result ===');
  console.log('Success: ' + success);
  console.log('Failed: ' + failed);
  
  if (errors.length > 0) {
    console.log('\nFailed tables:');
    errors.forEach(e => console.log('  ' + e.table + ': ' + e.error.substring(0, 150)));
  }

  await client.end();
}

main().catch(console.error);

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function audit() {
  const db = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  await db.connect();
  
  const tablesResult = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  const allTables = new Set(tablesResult.rows.map(r => r.table_name.toLowerCase()));
  
  const routeDir = path.join(__dirname, 'src', 'routes');
  const files = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
  
  // False positives to ignore
  const ignore = new Set(['select','where','order','group','limit','offset','set',
    'current_date','current_timestamp','now','false','true','null','unknown',
    'evaluation_date','current_date','date','13','integer','character']);
  
  console.log('=== Missing/non-existent table references ===');
  for (const file of files) {
    const content = fs.readFileSync(path.join(routeDir, file), 'utf-8');
    const matches = [...content.matchAll(/(?:FROM|INTO|UPDATE|JOIN\s+)\s+(\w+)/gi)];
    const tables = new Set(matches.map(m => m[1].toLowerCase()));
    for (const kw of ignore) tables.delete(kw);
    
    const missing = [...tables].filter(t => !allTables.has(t));
    if (missing.length > 0) {
      console.log(`\n[${file}]:`);
      missing.forEach(t => console.log(`  MISSING: ${t}`));
    }
  }
  
  // cabinet_board
  console.log('\n=== cabinet_board L/W type ===');
  const r1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cabinet_board' AND column_name IN ('length','width')");
  r1.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  // fund_flow FK (fixed query)
  console.log('\n=== fund_flow FK ===');
  try {
    const r2 = await db.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'fund_flow'::regclass AND conkey::text = '(order_id)' AND contype = 'f'`);
    console.log('  fund_flow.order_id FK:', r2.rows.length ? r2.rows.map(x=>x.conname).join(', ') : 'NONE');
  } catch(e) {
    console.log('  Error:', e.message);
  }
  
  // order_installation vs installation_task
  console.log('\n=== Installation tables ===');
  const r3 = await db.query("SELECT (SELECT COUNT(*) FROM order_installation) as oi_count, (SELECT COUNT(*) FROM installation_task) as it_count");
  const row = r3.rows[0];
  console.log(`  order_installation rows: ${row.oi_count}`);
  console.log(`  installation_task rows: ${row.it_count}`);
  
  // Check which one order.js actually uses
  console.log('\n=== order_installation columns ===');
  const r4 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='order_installation' ORDER BY ordinal_position");
  console.log('  Columns:', r4.rows.map(x=>x.column_name).join(', '));
  
  // package table (singular vs plural)
  console.log('\n=== package table count ===');
  const r5 = await db.query("SELECT COUNT(*) FROM package");
  console.log('  package:', r5.rows[0].count);
  const r6 = await db.query("SELECT COUNT(*) FROM packages");
  console.log('  packages:', r6.rows[0].count);
  
  // Missing tables: salary_month, order_item, production_stage_log, order_delivery
  console.log('\n=== Truly missing tables ===');
  for (const t of ['salary_month', 'order_item', 'production_stage_log', 'order_delivery']) {
    console.log(`  ${t}: ${allTables.has(t) ? 'EXISTS' : 'MISSING'}`);
  }

  await db.end();
}

audit().catch(e => { console.error(e.message); process.exit(1); });

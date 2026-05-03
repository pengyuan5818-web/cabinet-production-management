const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const RE_TABLE = /(?:FROM|INTO|UPDATE|JOIN\s+)\s+(\w+)/gi;

async function audit() {
  const db = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  await db.connect();
  
  // Get all tables
  const tablesResult = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const allTables = new Set(tablesResult.rows.map(r => r.table_name.toLowerCase()));
  console.log('Total DB tables:', allTables.size);
  
  const routeDir = path.join(__dirname, 'src', 'routes');
  const files = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
  
  console.log('\n=== Missing table references ===');
  for (const file of files) {
    const content = fs.readFileSync(path.join(routeDir, file), 'utf-8');
    const matches = [...content.matchAll(RE_TABLE)];
    const tables = new Set(matches.map(m => m[1].toLowerCase()));
    tables.delete('select'); tables.delete('where'); tables.delete('order');
    tables.delete('group'); tables.delete('limit'); tables.delete('offset'); tables.delete('set');
    
    const missing = [...tables].filter(t => !allTables.has(t));
    if (missing.length > 0) {
      console.log(`\n[${file}] -> missing tables:`, missing.join(', '));
    }
  }
  
  // Check cabinet_board
  console.log('\n=== cabinet_board length/width type ===');
  const r1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cabinet_board' AND column_name IN ('length','width')");
  r1.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
  
  // Check fund_flow FK
  console.log('\n=== fund_flow.order_id FK ===');
  const r2 = await db.query("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='fund_flow' AND constraint_type='FOREIGN KEY' AND column_name='order_id'");
  console.log('  FK constraints:', r2.rows.length ? r2.rows.map(x=>x.constraint_name).join(', ') : 'NONE');
  
  // Check order_installation vs installation_task
  console.log('\n=== order_installation count ===');
  const r3 = await db.query("SELECT COUNT(*) FROM order_installation");
  console.log('  order_installation rows:', r3.rows[0].count);
  
  const r4 = await db.query("SELECT COUNT(*) FROM installation_task");
  console.log('  installation_task rows:', r4.rows[0].count);
  
  // Check package table (singular vs plural)
  console.log('\n=== package table ===');
  const r5 = await db.query("SELECT COUNT(*) FROM package");
  console.log('  package rows:', r5.rows[0].count);
  
  const r6 = await db.query("SELECT COUNT(*) FROM packages");
  console.log('  packages rows:', r6.rows[0].count);

  await db.end();
}

audit().catch(e => { console.error(e.message); process.exit(1); });

const { Client } = require('pg');
async function main() {
  const c = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  await c.connect();
  // Check order_installation
  const r1 = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'order_installation' ORDER BY ordinal_position");
  console.log('order_installation columns:', r1.rows.map(x=>x.column_name).join(', '));
  // Check installation_task
  const r2 = await c.query("SELECT COUNT(*) FROM installation_task");
  console.log('installation_task rows:', r2.rows[0].count);
  // Check what tables exist with 'order' in name
  const r3 = await c.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'order%' OR table_name LIKE '%order%'");
  console.log('Order-related tables:', r3.rows.map(x=>x.table_name).join(', '));
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });

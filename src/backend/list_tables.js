const { Client } = require('pg');
async function main() {
  const c = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  await c.connect();
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  r.rows.forEach(row => console.log(row.table_name));
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });

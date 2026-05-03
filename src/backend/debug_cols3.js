const { Pool } = require('pg');
const pool = new Pool({ database: 'cabinet_factory', user: 'postgres', password: 'postgres', host: 'localhost', port: 5432 });
async function main() {
  const cols = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['stock_inventory']);
  console.log('stock_inventory:', JSON.stringify(cols.rows));
  const cols2 = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['warehouse']);
  console.log('warehouse:', JSON.stringify(cols2.rows));
  await pool.end();
}
main().catch(e => console.error(e.message));

const { Pool } = require('pg');
const pool = new Pool({ database: 'cabinet_factory', user: 'postgres', password: 'postgres', host: 'localhost', port: 5432 });
async function main() {
  const t1 = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['order_master']);
  console.log('order_master:', JSON.stringify(t1.rows.map(r => r.column_name)));
  const t2 = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['stock_in_detail']);
  console.log('stock_in_detail:', JSON.stringify(t2.rows.map(r => r.column_name)));
  await pool.end();
}
main().catch(e => console.error(e.message));

const { Pool } = require('pg');
const pool = new Pool({ database: 'cabinet_factory', user: 'postgres', password: 'postgres', host: 'localhost', port: 5432 });
async function main() {
  const cols = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['stock_out']);
  console.log('stock_out:', JSON.stringify(cols.rows.map(r => r.column_name)));
  const cols2 = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['stock_out_detail']);
  console.log('stock_out_detail:', JSON.stringify(cols2.rows.map(r => r.column_name)));
  await pool.end();
}
main().catch(e => console.error(e.message));

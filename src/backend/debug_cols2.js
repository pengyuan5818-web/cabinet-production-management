const { Pool } = require('pg');
const pool = new Pool({ database: 'cabinet_factory', user: 'postgres', password: 'postgres', host: 'localhost', port: 5432 });
async function main() {
  const cols = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['order_tracking']);
  console.log('order_tracking columns:', JSON.stringify(cols.rows));
  const cols2 = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['stock_in']);
  console.log('stock_in columns:', JSON.stringify(cols2.rows));
  const cols3 = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['supplier_payment']);
  console.log('supplier_payment columns:', JSON.stringify(cols3.rows));
  await pool.end();
}
main().catch(e => console.error(e.message));

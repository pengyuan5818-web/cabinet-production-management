const { Pool } = require('pg');
const pool = new Pool({ database: 'cabinet_factory', user: 'postgres', password: 'postgres', host: 'localhost', port: 5432 });
async function main() {
  const tables = ['supplier', 'material', 'employee'];
  for (const t of tables) {
    const cols = await pool.query('SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [t]);
    console.log('\n=== ' + t + ' ===');
    cols.rows.forEach(r => console.log(r.column_name, r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL', r.data_type));
  }
  await pool.end();
}
main().catch(e => console.error(e.message));

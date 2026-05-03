const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    host: 'localhost', port: 5432, database: 'cabinet_factory',
    user: 'postgres', password: 'postgres'
  });
  try {
    await client.connect();
    const sql = fs.readFileSync('C:/Users/Administrator/setup_design.sql', 'utf8');
    await client.query(sql);
    console.log('design_drawing table created');
    const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='design_drawing'");
    console.log('Tables:', r.rows.map(x => x.table_name).join(', '));
  } catch (e) { console.error('Error:', e.message); }
  finally { await client.end(); }
}
main();

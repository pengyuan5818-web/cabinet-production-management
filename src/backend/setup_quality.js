const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cabinet_factory',
    user: 'postgres',
    password: 'postgres'
  });
  
  try {
    await client.connect();
    const sql = fs.readFileSync('C:/Users/Administrator/setup_quality.sql', 'utf8');
    await client.query(sql);
    console.log('Quality tables created successfully');
    
    const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('quality_inspect','quality_standard')");
    console.log('Tables:', r.rows.map(x => x.table_name).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

main();

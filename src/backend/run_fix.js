const { Client } = require('pg');
const fs = require('fs');
async function main() {
  const client = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  try {
    await client.connect();
    const sql = fs.readFileSync('C:/Users/Administrator/fix_payable.sql', 'utf8');
    await client.query(sql);
    console.log('DDL executed OK');
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='payable' AND column_name IN ('reconciliation_id','payment_share')");
    console.log('New columns:', r.rows.map(x=>x.column_name).join(', '));
  } catch (e) { console.error('Error:', e.message); }
  finally { await client.end(); }
}
main();

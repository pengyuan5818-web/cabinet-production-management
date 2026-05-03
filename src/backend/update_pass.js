const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('New hash:', hash);
  
  const client = new Client({
    host: 'localhost',
    database: 'cabinet_factory',
    user: 'postgres',
    password: 'postgres',
    port: 5432
  });
  
  await client.connect();
  const result = await client.query(
    'UPDATE sys_user SET password_hash = $1 WHERE username = $2',
    [hash, 'admin']
  );
  console.log('Updated rows:', result.rowCount);
  await client.end();
}

main().catch(console.error);

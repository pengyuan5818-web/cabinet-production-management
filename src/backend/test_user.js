const { Pool } = require('pg');
const pool = new Pool({ database: 'cabinet_factory', user: 'postgres', password: 'postgres', host: 'localhost', port: 5432 });

async function main() {
  // List user-related tables
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%user%'");
  console.log('User tables:', JSON.stringify(tables.rows, null, 2));

  // Check sys_user structure
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sys_user'");
  console.log('sys_user columns:', JSON.stringify(cols.rows, null, 2));

  // Get admin user
  const admin = await pool.query("SELECT id, username, role FROM sys_user WHERE username = 'admin' LIMIT 1");
  console.log('Admin user:', JSON.stringify(admin.rows, null, 2));

  await pool.end();
}

main().catch(console.error);

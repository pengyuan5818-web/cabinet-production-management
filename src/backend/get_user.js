const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });

async function main() {
  // 查看 sys_user 表结构和数据
  const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sys_user' ORDER BY ordinal_position`);
  console.log('sys_user 列:', cols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));
  
  const users = await pool.query(`SELECT * FROM sys_user LIMIT 5`);
  console.log('\nsys_user 数据:');
  console.log(JSON.stringify(users.rows, null, 2));
  
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

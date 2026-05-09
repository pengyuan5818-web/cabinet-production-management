const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cabinet_factory',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  const client = await pool.connect();
  try {
    const approvalSql = fs.readFileSync('./src/db/approval_ddl.sql', 'utf8');
    await client.query(approvalSql);
    console.log('✅ approval_ddl.sql 执行成功');

    const contractSql = fs.readFileSync('./src/db/contract_ddl.sql', 'utf8');
    await client.query(contractSql);
    console.log('✅ contract_ddl.sql 执行成功');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('approval_requests', 'approval_history', 'contracts', 'contract_terms', 'contract_history')
      ORDER BY table_name
    `);
    console.log('已创建的表:', tables.rows.map(r => r.table_name).join(', '));
  } catch(e) {
    console.error('❌ 错误:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
run();

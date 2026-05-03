const { Pool } = require('pg');
const path = require('path');
const bcrypt = require(path.join(__dirname, 'node_modules', 'bcryptjs'));

async function main() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });
  const hash = await bcrypt.hash('test123', 10);
  const result = await pool.query(`
    INSERT INTO sys_user (id, username, password_hash, real_name, role, status, created_at, updated_at)
    VALUES (gen_random_uuid(), 'testuser', $1, '测试用户', 'admin', 'active', NOW(), NOW())
    ON CONFLICT (username) DO UPDATE SET password_hash = $1, updated_at = NOW()
    RETURNING id, username, role
  `, [hash]);
  console.log('测试用户创建成功:', JSON.stringify(result.rows));
  await pool.end();
}

main().then().catch(e => { console.error(e.message); process.exit(1); });

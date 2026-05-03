process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  // 检查employee表结构
  console.log('=== employee 表结构 ===');
  const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'employee' ORDER BY ordinal_position`);
  console.log(r.rows.map(c=>c.column_name).join(', '));

  // 尝试bcrypt解密admin密码（用常见密码）
  const bcrypt = require('bcryptjs');
  const r2 = await db.query('SELECT id, username, password_hash FROM sys_user WHERE username = $1', ['admin']);
  if (r2.rows.length) {
    const hash = r2.rows[0].password_hash;
    console.log('\nadmin hash:', hash.slice(0, 30));
    // 常见密码尝试
    for (const pw of ['admin', 'admin123', '123456', 'factory', 'password', 'BossLi88']) {
      const match = await bcrypt.compare(pw, hash);
      console.log(`  '${pw}' => ${match ? '✅ MATCH!' : '❌'}`);
      if (match) break;
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

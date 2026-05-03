process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  // 查看系统用户表
  console.log('=== sys_user 表 ===');
  const r = await db.query('SELECT id, username, real_name, role, status FROM sys_user LIMIT 10');
  console.log(JSON.stringify(r.rows, null, 2));

  // 查看dealer_user表
  console.log('\n=== dealer_user 表 ===');
  const r2 = await db.query('SELECT id, username, dealer_id, role FROM dealer_user LIMIT 10');
  console.log(JSON.stringify(r2.rows, null, 2));

  // 查看employee表
  console.log('\n=== employee 表 ===');
  const r3 = await db.query('SELECT id, name, phone, department FROM employee LIMIT 5');
  console.log(JSON.stringify(r3.rows, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

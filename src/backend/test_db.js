// 从后端项目目录加载 pg 模块
process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');
console.log('=== 数据库连接测试 ===');
db.query('SELECT now(), version() as ver').then(r => {
  console.log('✅ DB连接成功:', r.rows[0].now);
  console.log('PostgreSQL版本:', r.rows[0].ver.slice(0,60));
  return db.query('SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename', ['public']);
}).then(r => {
  console.log('\n当前存在的表:', r.rows.map(t=>t.tablename).join(', '));
  console.log('共', r.rows.length, '张表');
  process.exit(0);
}).catch(e => {
  console.error('❌ DB错误:', e.message);
  process.exit(1);
});

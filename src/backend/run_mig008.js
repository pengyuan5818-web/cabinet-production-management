process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
async function main() {
  console.log('执行迁移 008...');
  try {
    const mig = require('./src/migrations/008_cost_accounting.js');
    // 008 用 migrate() 自执行
    console.log('迁移 008 执行完成');
  } catch(e) {
    console.error('迁移 008 失败:', e.message.split('\n')[0]);
    process.exit(1);
  }
  process.exit(0);
}
main();

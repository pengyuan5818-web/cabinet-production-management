process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  // Bug#6: 检查 order_master 表是否有 priority 字段
  console.log('=== Bug#6: order_master 字段检查 ===');
  const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'order_master' ORDER BY ordinal_position`);
  console.log('order_master 字段:', cols.rows.map(c=>c.column_name).join(', '));

  // Bug#4: 检查 dealers 路由顺序
  console.log('\n=== Bug#4: dealer.js 路由顺序检查 ===');
  const fs = require('fs');
  const dealerPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/dealer.js';
  const dealer = fs.readFileSync(dealerPath, 'utf8');
  const lines = dealer.split('\n');
  lines.forEach((l,i) => {
    if (l.includes('router.get') || l.includes('router.post') || l.includes('router.put') || l.includes('router.delete')) {
      if (!l.includes('//')) console.log(`  line ${i+1}: ${l.trim()}`);
    }
  });

  // Bug#5: 检查 openapi keys 路由
  console.log('\n=== Bug#5: openapi/keys 路由检查 ===');
  const dealerContent = fs.readFileSync(dealerPath, 'utf8');
  const openapiIdx = dealerContent.indexOf('openapi');
  if (openapiIdx >= 0) {
    const start = Math.max(0, openapiIdx - 200);
    const end = Math.min(dealerContent.length, openapiIdx + 500);
    console.log('openapi 附近代码:', dealerContent.slice(start, end));
  } else {
    console.log('dealer.js 中没有 openapi 相关代码！');
  }

  // Bug#3: 检查 reports 路由
  console.log('\n=== Bug#3: reports/production/scheduling 路由检查 ===');
  const reportPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/report.js';
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, 'utf8');
    const lines = report.split('\n');
    lines.forEach((l,i) => {
      if ((l.includes('router.get') || l.includes('scheduling')) && !l.includes('//')) {
        console.log(`  line ${i+1}: ${l.trim()}`);
      }
    });
  } else { console.log('report.js 不存在！'); }

  // Bug#2: cost/allocation/pool 路由
  console.log('\n=== Bug#2: cost/allocation/pool 路由检查 ===');
  const costPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/cost.js';
  if (fs.existsSync(costPath)) {
    const cost = fs.readFileSync(costPath, 'utf8');
    const lines = cost.split('\n');
    lines.forEach((l,i) => {
      if ((l.includes('router.get') || l.includes('router.post') || l.includes('allocation')) && !l.includes('//')) {
        console.log(`  line ${i+1}: ${l.trim()}`);
      }
    });
  } else { console.log('cost.js 不存在！'); }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

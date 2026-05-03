process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  // 深度检查 webhookService 实现
  console.log('=== webhookService 源码分析 ===');
  const fs = require('fs');
  const wsPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/webhookService.js';
  const ws = fs.readFileSync(wsPath, 'utf8');
  const lines = ws.split('\n');
  lines.forEach((l,i) => {
    if (l.includes('events') || l.includes('event_type') || l.includes('trigger') || l.includes('WHERE')) {
      console.log(`  line ${i+1}: ${l.trim()}`);
    }
  });

  // 检查 webhook 表的 event_type 格式
  console.log('\n=== webhook 数据 ===');
  const webhooks = await db.query('SELECT id, dealer_id, event_type, url, is_active FROM webhook LIMIT 5');
  console.log(JSON.stringify(webhooks.rows, null, 2));

  // 检查 webhook_log 表
  try {
    const whl = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['webhook_log']);
    console.log('\nwebhook_log 字段:', whl.rows.map(r=>r.column_name).join(', '));
  } catch(e) { console.log('\nwebhook_log 不存在:', e.code); }

  // 检查 schedulingService 完整 SQL（它还用了哪些字段？）
  console.log('\n=== schedulingService SQL 字段检查 ===');
  const sched = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/schedulingService.js', 'utf8');
  const schedLines = sched.split('\n');
  schedLines.forEach((l,i) => {
    if (l.includes('SELECT') && l.includes('om.')) {
      console.log(`  line ${i+1}: ${l.trim()}`);
    }
  });

  // 测试 cost.js /report/detail 的完整错误
  console.log('\n=== cost.js /report/detail 完整SQL ===');
  const costPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/cost.js';
  const cost = fs.readFileSync(costPath, 'utf8');
  const costLines = cost.split('\n');
  // 找 /report/detail 处理器
  let inHandler = false;
  costLines.forEach((l,i) => {
    if (l.includes('/report/detail')) inHandler = true;
    if (inHandler) {
      console.log(`  line ${i+1}: ${l.trim()}`);
      if (l.includes('res.json') || l.includes('res.status')) inHandler = false;
    }
  });

  process.exit(0);
}
main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });

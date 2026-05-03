process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const fs = require('fs');

async function main() {
  // EVENT_TYPES 定义 vs 实际触发
  console.log('=== webhook EVENT_TYPES 定义 ===');
  const ws = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/webhookService.js', 'utf8');
  const wsLines = ws.split('\n');
  wsLines.forEach((l,i) => {
    if (l.includes('EVENT_TYPES') || l.includes("': '")) {
      console.log(`  line ${i+1}: ${l.trim()}`);
    }
  });

  // 找出代码中所有 webhookService.trigger 调用
  console.log('\n=== 所有 webhookService.trigger 调用 ===');
  const files = [
    'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/order.js',
    'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/shipment.js',
    'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/finance.js',
    'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/commissionService.js',
  ];
  for (const fp of files) {
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n');
    const fname = fp.split('/').pop();
    let found = false;
    lines.forEach((l,i) => {
      if (l.includes('webhookService.trigger') || l.includes('webhook.trigger')) {
        if (!found) { console.log(`\n${fname}:`); found = true; }
        console.log(`  line ${i+1}: ${l.trim()}`);
      }
    });
  }

  // 检查 schedulingService 中的 estimated_hours
  console.log('\n=== schedulingService estimated_hours 使用 ===');
  const sched = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/schedulingService.js', 'utf8');
  const schedLines = sched.split('\n');
  schedLines.forEach((l,i) => {
    if (l.includes('estimated_hours') || l.includes('schedule_status')) {
      console.log(`  line ${i+1}: ${l.trim()}`);
    }
  });

  // 完整理解 Bug#6: schedulingService 在 generateSchedule 中引用了哪些不存在的字段
  console.log('\n=== schedulingService.generateSchedule 完整 SQL ===');
  let inFn = false;
  let braceCount = 0;
  schedLines.forEach((l,i) => {
    if (l.includes('async function generateSchedule')) { inFn = true; braceCount = 0; }
    if (inFn) {
      if (l.includes('SELECT') || l.includes('FROM') || l.includes('JOIN')) {
        console.log(`  ${i+1}: ${l}`);
      }
      braceCount += (l.match(/{/g)||[]).length;
      braceCount -= (l.match(/}/g)||[]).length;
      if (braceCount === 0 && inFn && i > 5) inFn = false;
    }
  });

  process.exit(0);
}
main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });

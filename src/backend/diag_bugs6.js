process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');
const fs = require('fs');

async function main() {
  // costService 中 order_cost_summary 查询
  console.log('=== costService.getCostDetailReport 中的 SQL ===');
  const csPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/costAccountingService.js';
  const cs = fs.readFileSync(csPath, 'utf8');
  const lines = cs.split('\n');
  let inFn = false;
  lines.forEach((l,i) => {
    if (l.includes('async getCostDetailReport') || l.includes('getCostDetailReport')) inFn = true;
    if (inFn) {
      console.log(`  ${i+1}: ${l}`);
      if (l.includes('module.exports') || (l.includes('}') && inFn && i > 50)) { inFn = false; }
    }
  });

  // 检查 material_bom 表
  console.log('\n=== material_bom 表结构 ===');
  try {
    const cols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['material_bom']);
    console.log('material_bom 字段:', cols.rows.map(r=>r.column_name).join(', '));
  } catch(e) { console.log('material_bom 不存在:', e.code); }

  // 检查 order_bom 表
  console.log('\n=== order_bom 表结构 ===');
  try {
    const cols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['order_bom']);
    console.log('order_bom 字段:', cols.rows.map(r=>r.column_name).join(', '));
  } catch(e) { console.log('order_bom 不存在:', e.code); }

  // 检查 cost_record 表
  console.log('\n=== cost_record 表结构 ===');
  try {
    const cols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['cost_record']);
    console.log('cost_record 字段:', cols.rows.map(r=>r.column_name).join(', '));
    const sample = await db.query('SELECT * FROM cost_record LIMIT 2');
    console.log('样本数据:', JSON.stringify(sample.rows, null, 2));
  } catch(e) { console.log('cost_record 不存在:', e.code); }

  // 检查 webhookService trigger 中 event_type 查询
  console.log('\n=== webhookService.trigger SQL ===');
  const ws = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/services/webhookService.js', 'utf8');
  const wsLines = ws.split('\n');
  let triggerStarted = false;
  wsLines.forEach((l,i) => {
    if (l.includes('async trigger(')) triggerStarted = true;
    if (triggerStarted) {
      if (l.includes('WHERE dealer_id') || l.includes('webhook_id') || l.includes('event_type')) {
        console.log(`  ${i+1}: ${l.trim()}`);
      }
      if (l.includes('return') && triggerStarted) triggerStarted = false;
    }
  });

  process.exit(0);
}
main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });

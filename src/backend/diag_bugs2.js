process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const db = require('./src/db');

async function main() {
  // 确认所有 Bug 根因
  console.log('=== Bug#2 验证: cost/allocation/pool 路由 ===');
  // cost.js 注册在 /api/cost，overhead-pool 路由在 line 178 → /api/cost/overhead-pool
  // 所以正确的路径是 /api/cost/overhead-pool 不是 /api/cost/allocation/pool
  console.log('正确路径: GET /api/cost/overhead-pool');
  console.log('错误路径: GET /api/cost/allocation/pool (不存在)');

  console.log('\n=== Bug#4 验证: dealers/commissions ===');
  // dealer.js line 511: router.get('/commissions/summary', ...) → /api/dealers/commissions/summary
  // 测试路径 GET /api/dealers/commissions → 匹配到 /:id (line66)，id="commissions"
  // "无效的类型 uuid 输入" 因为 id 不是 uuid
  console.log('正确路径: GET /api/dealers/commissions/summary');
  console.log('错误路径: GET /api/dealers/commissions');

  console.log('\n=== Bug#5 验证: dealers/openapi/keys ===');
  // dealer.js 有两个 api-key 路由（单数）：
  // line 370: router.get('/:id/api-key', ...) → GET /api/dealers/:id/api-key
  // 但测试用的是 /dealers/openapi/keys (plural)
  // dealer.js 中没有 openapi 相关路由！
  console.log('实际路径: GET /api/dealers/:id/api-key (单数, 需要dealer_id)');
  console.log('错误路径: GET /api/dealers/openapi/keys (路由不存在)');

  console.log('\n=== Bug#3 验证: reports/production/scheduling ===');
  // report.js 中有 /production/stages 但没有 /production/scheduling
  // 智能排程统计在 production.js 中: GET /api/production/schedule/stats
  console.log('report.js 中的路由: /production/stages (line 480)');
  console.log('实际排程统计: GET /api/production/schedule/stats (在production.js)');

  console.log('\n=== Bug#6 验证: order_master.priority 字段缺失 ===');
  // 检查 production_stage 表
  const stage = await db.query('SELECT stage, stage_name, priority FROM production_stage LIMIT 5');
  console.log('production_stage.priority 列存在:', stage.fields?.find(f=>f.name==='priority') ? '是' : '否');
  console.log('但 order_master 表没有 priority 字段（已确认）');
  console.log('schedulingService 使用 om.priority 会报错');

  console.log('\n=== Bug#1 验证: order_cost_summary 表缺失 ===');
  try {
    await db.query('SELECT 1 FROM order_cost_summary LIMIT 1');
    console.log('order_cost_summary 表存在');
  } catch(e) {
    console.log('order_cost_summary 表不存在:', e.message);
  }

  console.log('\n=== 深度检查 webhook 表结构 ===');
  const whCols = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['webhook']);
  console.log('webhook 字段:', whCols.rows.map(c=>c.column_name).join(', '));

  console.log('\n=== 检查 commissioning 路由: dealer.js 中 /commissions/settle ===');
  // dealer.js line 458: router.post('/:id/commissions/settle')
  // 但 /api/dealers/:id/commissions/settle 需要 settlement_ids 参数
  const r = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['dealer_commission']);
  console.log('dealer_commission 字段:', r.rows.map(c=>c.column_name).join(', '));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
